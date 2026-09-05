import { useEffect, useRef } from 'react'
import { poissonDisc } from '../lib/poisson'
import { SNOISE_GLSL } from '../lib/snoise'
import {
  FULLSCREEN_VS,
  createFbo,
  createStateTexture,
  hexToRgb,
  link,
} from '../lib/glutil'

/* ── what this is ─────────────────────────────────────────────────────────
   A GPGPU particle field. Every particle keeps a fixed "home" position and
   is pushed around by a ring that trails the cursor; layered simplex noise
   keeps the whole surface breathing so it never reads as static.

   The simulation runs entirely on the GPU. Particle state lives in a float
   texture — xy = position, z = scale, w = velocity — and each frame a
   fragment shader reads the previous state and writes the next one into a
   second texture, which then becomes the input for the following frame.
   That ping-pong is why there is no per-particle work on the CPU: 25k
   particles cost the same JavaScript as one.

   Rendered with raw WebGL2 rather than three.js. The technique needs float
   render targets and two shader programs, none of which needs a scene
   graph — and three.js would add ~150KB gzipped to a marketing page. */

/** Field extent in simulation units. Wider than any viewport aspect so the
 *  layout never has to be regenerated on resize — the render pass just
 *  divides x by the aspect and lets the edges clip. */
const FIELD_X = 2.2
const FIELD_Y = 1.0

/** Radius of the ring that trails the cursor, and the two band widths.
 *  The wide band drives brightness, the narrow one drives displacement.
 *  Widths scale with the radius — holding them fixed while the radius grows
 *  just makes the outline proportionally thinner. */
const RING_RADIUS = 0.34
const RING_WIDTH = 0.085
const RING_WIDTH_2 = 0.026
/** How hard the narrow band shoves particles off their home position. */
const RING_DISPLACEMENT = 0.55

/** Ring easing per frame, at 60fps. Fast enough to stay under a moving
 *  cursor, short of 1.0 so it still arrives with a little weight rather
 *  than snapping. Scaled by delta time below so it holds up off 60fps. */
const EASE_ACTIVE = 0.16
const EASE_IDLE = 0.02

interface ParticleFieldProps {
  /** Target particle count. Rounded down to a square for the state texture. */
  count?: number
  className?: string
}

/* ── simulation pass ──────────────────────────────────────────────────────
   One fragment per particle. Reads the previous state, writes the next.
   The maths here is a port of the ring-displacement model: a pair of
   smoothstep bands around the cursor produce a mask, the mask drives both
   scale and displacement, and four octaves of simplex noise plus a sine
   wobble keep the field alive between cursor passes. */
const SIM_FS = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D uPosition;
uniform sampler2D uPosRefs;
uniform vec2  uRingPos;
uniform vec2  uTexSize;
uniform float uTime;
uniform float uRingRadius;
uniform float uRingWidth;
uniform float uRingWidth2;
uniform float uRingDisplacement;

out vec4 fragColor;

${SNOISE_GLSL}

void main() {
  vec2 uv = gl_FragCoord.xy / uTexSize;

  vec4 pFrame = texture(uPosition, uv);
  float scale    = pFrame.z;
  float velocity = pFrame.w;

  // Home position. Particles are displaced relative to this, never from
  // wherever they drifted to — that is what makes them spring back.
  vec2 refPos = texture(uPosRefs, uv).xy;

  float time = uTime * 0.5;
  vec2 currentPos = refPos;

  // Carried offset, damped every frame. This is the spring: with no ring
  // nearby the 0.8 decay pulls each particle home on its own.
  vec2 pos = pFrame.xy * 0.8;

  float dist = distance(currentPos, uRingPos);
  float noise0 = snoise(vec3(currentPos * 0.2 + vec2(18.4924, 72.9744), time * 0.5));
  // Break up the trailing edge so the ring never looks like a clean circle.
  float dist1 = distance(currentPos + (noise0 * 0.005), uRingPos);

  // Two concentric bands: wide for glow, narrow for the shove.
  float t  = smoothstep(uRingRadius - (uRingWidth  * 2.0), uRingRadius, dist)
           - smoothstep(uRingRadius, uRingRadius + uRingWidth,  dist1);
  float t2 = smoothstep(uRingRadius - (uRingWidth2 * 2.0), uRingRadius, dist)
           - smoothstep(uRingRadius, uRingRadius + uRingWidth2, dist1);
  // Everything inside the ring, for a soft interior fill.
  float t3 = smoothstep(uRingRadius + uRingWidth2, uRingRadius, dist);

  // The band differences can go slightly negative where the noise-jittered
  // radius overtakes the clean one. pow() of a negative base is undefined
  // in GLSL and shows up as black speckle, so clamp before raising.
  t  = pow(max(t,  0.0), 2.0);
  t2 = pow(max(t2, 0.0), 3.0);

  t += t2 * 3.0;
  t += t3 * 0.4;
  t += snoise(vec3(currentPos * 30.0 + vec2(11.4924, 12.9744), time * 0.5)) * t3 * 0.5;

  // Baseline shimmer. Without this the field is invisible until the cursor
  // arrives; this is what leaves faint particles drifting everywhere.
  float nS = snoise(vec3(currentPos * 2.0 + vec2(18.4924, 72.9744), time * 0.5));
  t += pow((nS + 1.5) * 0.5, 2.0) * 0.6;

  // Mid-scale drift, then a finer grain on top.
  float noise1 = snoise(vec3(currentPos * 4.0  + vec2(88.494,  32.4397), time * 0.35));
  float noise2 = snoise(vec3(currentPos * 4.0  + vec2(50.904,  120.947), time * 0.35));
  float noise3 = snoise(vec3(currentPos * 20.0 + vec2(18.4924, 72.9744), time * 0.5));
  float noise4 = snoise(vec3(currentPos * 20.0 + vec2(50.904,  120.947), time * 0.5));

  vec2 disp  = vec2(noise1, noise2) * 0.03;
       disp += vec2(noise3, noise4) * 0.005;

  // Standing wave, scaled by distance so it dies down inside the ring.
  disp.x += sin((refPos.x * 20.0) + (time * 4.0)) * 0.02 * clamp(dist, 0.0, 1.0);
  disp.y += cos((refPos.y * 20.0) + (time * 3.0)) * 0.02 * clamp(dist, 0.0, 1.0);

  // Push away from the ring centre, weighted by the narrow band.
  pos -= (uRingPos - (currentPos + disp)) * pow(max(t2, 0.0), 0.75) * uRingDisplacement;

  // Ease scale toward the target so particles fade up and down rather than
  // popping as the ring sweeps past.
  scale += (t - scale) * 0.2;

  vec2 finalPos = currentPos + disp + (pos * 0.25);

  velocity = velocity * 0.5 + scale * 0.25;

  fragColor = vec4(finalPos, scale, velocity);
}
`

const RENDER_VS = /* glsl */ `#version 300 es
in vec2 aUv;
in float aSeed;

uniform sampler2D uPosition;
uniform float uParticleScale;
uniform float uPixelRatio;
uniform float uAspect;

out float vScale;
out float vSeed;

void main() {
  vec4 p = texture(uPosition, aUv);
  vScale = p.z;
  vSeed  = aSeed;

  // x is divided by aspect here rather than baked into the layout, so a
  // resize never requires regenerating the field.
  gl_Position  = vec4(p.x / uAspect, p.y, 0.0, 1.0);
  gl_PointSize = max(vScale * 7.0 * (uPixelRatio * 0.5) * uParticleScale, 0.0);
}
`

const RENDER_FS = /* glsl */ `#version 300 es
precision highp float;

in float vScale;
in float vSeed;

uniform vec3  uColor;
uniform vec3  uAccent;
uniform float uAlpha;

out vec4 fragColor;

void main() {
  // Round the point off; without this every particle is a hard square.
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.08, d);

  a *= clamp(vScale, 0.0, 1.0) * uAlpha;
  if (a <= 0.002) discard;

  // A minority of particles carry the accent hue, so the field reads as
  // one colour with life in it rather than two interleaved colours.
  vec3 c = mix(uColor, uAccent, smoothstep(0.72, 1.0, vSeed));

  // Additive: overlapping particles bloom instead of flattening.
  fragColor = vec4(c * a, a);
}
`

export default function ParticleField({ count = 26000, className }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    })

    // No WebGL2, or no float render targets — the field simply does not
    // appear. It is decoration; the hero reads fine without it.
    if (!gl) return
    if (!gl.getExtension('EXT_color_buffer_float')) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /* ── particle layout ──────────────────────────────────────────────── */

    // Poisson spacing that lands near the requested count. The 0.75 accounts
    // for blue-noise packing being looser than a square grid.
    const area = FIELD_X * 2 * FIELD_Y * 2
    const minDistance = Math.sqrt(area / (count / 0.75))
    const pts = poissonDisc({
      width: FIELD_X * 2,
      height: FIELD_Y * 2,
      minDistance,
    })

    // The state texture is square, so use as many points as fill it exactly.
    const size = Math.floor(Math.sqrt(pts.length))
    const total = size * size
    if (total === 0) return

    const homes = new Float32Array(total * 4)
    const uvs = new Float32Array(total * 2)
    const seeds = new Float32Array(total)

    for (let i = 0; i < total; i++) {
      const [px, py] = pts[i]
      homes[i * 4 + 0] = px - FIELD_X // centre on the origin
      homes[i * 4 + 1] = py - FIELD_Y
      homes[i * 4 + 2] = 0 // scale, grown by the sim
      homes[i * 4 + 3] = 0 // velocity

      uvs[i * 2 + 0] = ((i % size) + 0.5) / size
      uvs[i * 2 + 1] = (Math.floor(i / size) + 0.5) / size

      seeds[i] = Math.random()
    }

    /* ── GL resources ─────────────────────────────────────────────────── */

    const refTex = createStateTexture(gl, size, homes)
    let texA = createStateTexture(gl, size, homes)
    let texB = createStateTexture(gl, size, null)

    let fboA = createFbo(gl, texA)
    let fboB = createFbo(gl, texB)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    let simProg: WebGLProgram
    let renderProg: WebGLProgram
    try {
      simProg = link(gl, FULLSCREEN_VS, SIM_FS)
      renderProg = link(gl, RENDER_VS, RENDER_FS)
    } catch (err) {
      // A driver that rejects the shaders should not take the page down.
      console.warn('ParticleField: shader setup failed, skipping', err)
      return
    }

    const simU = {
      uPosition: gl.getUniformLocation(simProg, 'uPosition'),
      uPosRefs: gl.getUniformLocation(simProg, 'uPosRefs'),
      uRingPos: gl.getUniformLocation(simProg, 'uRingPos'),
      uTexSize: gl.getUniformLocation(simProg, 'uTexSize'),
      uTime: gl.getUniformLocation(simProg, 'uTime'),
      uRingRadius: gl.getUniformLocation(simProg, 'uRingRadius'),
      uRingWidth: gl.getUniformLocation(simProg, 'uRingWidth'),
      uRingWidth2: gl.getUniformLocation(simProg, 'uRingWidth2'),
      uRingDisplacement: gl.getUniformLocation(simProg, 'uRingDisplacement'),
    }

    const renderU = {
      uPosition: gl.getUniformLocation(renderProg, 'uPosition'),
      uParticleScale: gl.getUniformLocation(renderProg, 'uParticleScale'),
      uPixelRatio: gl.getUniformLocation(renderProg, 'uPixelRatio'),
      uAspect: gl.getUniformLocation(renderProg, 'uAspect'),
      uColor: gl.getUniformLocation(renderProg, 'uColor'),
      uAccent: gl.getUniformLocation(renderProg, 'uAccent'),
      uAlpha: gl.getUniformLocation(renderProg, 'uAlpha'),
    }

    const simVao = gl.createVertexArray()!

    const renderVao = gl.createVertexArray()!
    gl.bindVertexArray(renderVao)

    const uvBuf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW)
    const aUv = gl.getAttribLocation(renderProg, 'aUv')
    gl.enableVertexAttribArray(aUv)
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0)

    const seedBuf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf)
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW)
    const aSeed = gl.getAttribLocation(renderProg, 'aSeed')
    gl.enableVertexAttribArray(aSeed)
    gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, 0, 0)

    gl.bindVertexArray(null)

    /* ── palette, read from the stylesheet so the two never drift ─────── */

    const css = getComputedStyle(document.documentElement)
    const color = hexToRgb((css.getPropertyValue('--color-text') || '#e9e9ed').trim())
    const accent = hexToRgb((css.getPropertyValue('--color-accent') || '#9184d9').trim())

    /* ── sizing ───────────────────────────────────────────────────────── */

    let dpr = 1
    let aspect = 1

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      // Cap DPR: this is a full-bleed additive pass and 3x retina buys
      // nothing visible on particles this small.
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      aspect = rect.width / rect.height
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    /* ── cursor ───────────────────────────────────────────────────────── */

    const ring = { x: 0, y: 0 }
    const cursor = { x: 0, y: 0 }
    // Last known pointer position, held between moves. This has to persist:
    // deriving the cursor target by decaying it toward the idle drift makes
    // a stationary pointer slowly lose its grip and the ring wander off.
    const pointer = { x: 0, y: 0 }
    let pointerOver = false

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      pointerOver = nx >= -1 && nx <= 1 && ny >= -1 && ny <= 1
      pointer.x = nx * aspect
      pointer.y = ny
    }
    const onPointerLeave = () => {
      pointerOver = false
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerleave', onPointerLeave, { passive: true })

    /* ── pause when offscreen ─────────────────────────────────────────── */

    let visible = true
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    })
    io.observe(canvas)

    /* ── frame loop ───────────────────────────────────────────────────── */

    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    // Premultiplied additive: the fragment shader already multiplies colour
    // by alpha, so overlapping particles accumulate into a bloom.
    gl.blendFunc(gl.ONE, gl.ONE)

    let raf = 0
    let time = 0
    let last = performance.now()
    let disposed = false

    const step = (now: number) => {
      if (disposed) return
      raf = requestAnimationFrame(step)

      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      if (!visible) return

      if (!reduceMotion) time += dt

      // Slow idle wander so the field still moves with no pointer present.
      const driftX = Math.sin(time * 0.75 + 21.028) * 0.2
      const driftY = Math.cos(time * 0.63 + 7.31) * 0.1

      // Recomputed from the held pointer each frame, never accumulated —
      // a still pointer keeps the ring exactly where it was left, with
      // just enough drift mixed in that it never looks frozen.
      if (pointerOver) {
        cursor.x = pointer.x + driftX * 0.1
        cursor.y = pointer.y + driftY * 0.1
      } else {
        cursor.x = driftX
        cursor.y = driftY
      }

      // Exponential smoothing normalised to 60fps. A raw per-frame lerp
      // would track twice as fast on a 120Hz display as on a 60Hz one.
      const base = pointerOver ? EASE_ACTIVE : EASE_IDLE
      const ease = 1 - Math.pow(1 - base, dt * 60)
      ring.x += (cursor.x - ring.x) * ease
      ring.y += (cursor.y - ring.y) * ease

      // ── simulation: read texA, write texB ──
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboB)
      gl.viewport(0, 0, size, size)
      gl.disable(gl.BLEND)
      gl.useProgram(simProg)
      gl.bindVertexArray(simVao)

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texA)
      gl.uniform1i(simU.uPosition, 0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, refTex)
      gl.uniform1i(simU.uPosRefs, 1)

      gl.uniform2f(simU.uRingPos, ring.x, ring.y)
      gl.uniform2f(simU.uTexSize, size, size)
      gl.uniform1f(simU.uTime, time)
      gl.uniform1f(simU.uRingRadius, RING_RADIUS)
      gl.uniform1f(simU.uRingWidth, RING_WIDTH)
      gl.uniform1f(simU.uRingWidth2, RING_WIDTH_2)
      gl.uniform1f(simU.uRingDisplacement, RING_DISPLACEMENT)

      gl.drawArrays(gl.TRIANGLES, 0, 3)

      // ── render the freshly written state ──
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.enable(gl.BLEND)

      gl.useProgram(renderProg)
      gl.bindVertexArray(renderVao)

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texB)
      gl.uniform1i(renderU.uPosition, 0)

      // Scale points with viewport width so the field keeps its density on
      // a phone and does not turn into confetti on a 5K display.
      gl.uniform1f(renderU.uParticleScale, (canvas.width / dpr / 2000) * 1.45)
      gl.uniform1f(renderU.uPixelRatio, dpr)
      gl.uniform1f(renderU.uAspect, aspect)
      gl.uniform3f(renderU.uColor, color[0], color[1], color[2])
      gl.uniform3f(renderU.uAccent, accent[0], accent[1], accent[2])
      gl.uniform1f(renderU.uAlpha, 0.85)

      gl.drawArrays(gl.POINTS, 0, total)
      gl.bindVertexArray(null)

      // Swap: this frame's output is next frame's input.
      ;[texA, texB] = [texB, texA]
      ;[fboA, fboB] = [fboB, fboA]
    }

    raf = requestAnimationFrame(step)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)

      gl.deleteTexture(refTex)
      gl.deleteTexture(texA)
      gl.deleteTexture(texB)
      gl.deleteFramebuffer(fboA)
      gl.deleteFramebuffer(fboB)
      gl.deleteBuffer(uvBuf)
      gl.deleteBuffer(seedBuf)
      gl.deleteVertexArray(simVao)
      gl.deleteVertexArray(renderVao)
      gl.deleteProgram(simProg)
      gl.deleteProgram(renderProg)
    }
  }, [count])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
