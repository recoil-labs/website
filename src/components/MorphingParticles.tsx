import { useEffect, useRef } from 'react'
import { poissonDisc } from '../lib/poisson'
import { SNOISE_GLSL } from '../lib/snoise'
import { textToPoints } from '../lib/shapePoints'
import {
  FULLSCREEN_VS,
  createFbo,
  createStateTexture,
  hexToRgb,
  link,
} from '../lib/glutil'

/* ── what this is ─────────────────────────────────────────────────────────
   The hero's particle field with one addition: every particle holds a
   second home. At rest it sits in a scattered cloud; on hover the whole
   field migrates to a point cloud sampled from a rasterised shape, so the
   particles assemble into a word and hold it until the pointer leaves.

   Same GPGPU ping-pong as ParticleField — state in a float texture, one
   fragment per particle, no per-particle JavaScript. The morph is a single
   extra uniform mixed between the two home textures. */

const FIELD_Y = 1.0

/** Cursor ring, deliberately smaller than the hero's — this sits inside a
 *  card, so the interaction should feel local rather than atmospheric. */
const RING_RADIUS = 0.26
const RING_WIDTH = 0.07
const RING_WIDTH_2 = 0.022
const RING_DISPLACEMENT = 0.4

/** Morph easing per frame at 60fps. Slower than the ring: the assembly is
 *  the thing you are meant to watch, so it should take about a second. */
const MORPH_EASE = 0.055

interface MorphingParticlesProps {
  /** Word the particles assemble into on hover. */
  text: string
  /** Element that drives the hover. Defaults to the canvas's parent, which
   *  is usually the card rather than the canvas itself. */
  hoverTargetRef?: React.RefObject<HTMLElement | null>
  count?: number
  className?: string
}

const SIM_FS = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D uPosition;
uniform sampler2D uPosRefs;
uniform sampler2D uPosTarget;
uniform vec2  uRingPos;
uniform vec2  uTexSize;
uniform float uTime;
uniform float uMorph;
uniform float uRingRadius;
uniform float uRingWidth;
uniform float uRingWidth2;
uniform float uRingDisplacement;

out vec4 fragColor;

${SNOISE_GLSL}

void main() {
  vec2 uv = gl_FragCoord.xy / uTexSize;

  vec4 pFrame = texture(uPosition, uv);
  float scale = pFrame.z;

  vec2 scattered = texture(uPosRefs, uv).xy;
  vec2 target    = texture(uPosTarget, uv).xy;

  // Ease the migration per particle rather than snapping the home point.
  // smoothstep on the morph gives the cloud a soft start and settle.
  float m = smoothstep(0.0, 1.0, uMorph);
  vec2 refPos = mix(scattered, target, m);

  float time = uTime * 0.5;
  vec2 currentPos = refPos;
  vec2 pos = pFrame.xy * 0.8;

  float dist = distance(currentPos, uRingPos);
  float noise0 = snoise(vec3(currentPos * 0.2 + vec2(18.4924, 72.9744), time * 0.5));
  float dist1 = distance(currentPos + (noise0 * 0.005), uRingPos);

  float t  = smoothstep(uRingRadius - (uRingWidth  * 2.0), uRingRadius, dist)
           - smoothstep(uRingRadius, uRingRadius + uRingWidth,  dist1);
  float t2 = smoothstep(uRingRadius - (uRingWidth2 * 2.0), uRingRadius, dist)
           - smoothstep(uRingRadius, uRingRadius + uRingWidth2, dist1);
  float t3 = smoothstep(uRingRadius + uRingWidth2, uRingRadius, dist);

  // Clamp before pow — the band difference can go slightly negative where
  // the jittered radius overtakes the clean one, and pow() of a negative
  // base is undefined in GLSL and shows up as black speckle.
  t  = pow(max(t,  0.0), 2.0);
  t2 = pow(max(t2, 0.0), 3.0);

  t += t2 * 3.0;
  t += t3 * 0.4;

  float nS = snoise(vec3(currentPos * 2.0 + vec2(18.4924, 72.9744), time * 0.5));
  t += pow((nS + 1.5) * 0.5, 2.0) * 0.6;

  // Assembled particles get a floor on brightness so the word reads even
  // where the ring is nowhere near it.
  t = mix(t, max(t, 0.85), m);

  float noise1 = snoise(vec3(currentPos * 4.0  + vec2(88.494,  32.4397), time * 0.35));
  float noise2 = snoise(vec3(currentPos * 4.0  + vec2(50.904,  120.947), time * 0.35));
  float noise3 = snoise(vec3(currentPos * 20.0 + vec2(18.4924, 72.9744), time * 0.5));
  float noise4 = snoise(vec3(currentPos * 20.0 + vec2(50.904,  120.947), time * 0.5));

  vec2 disp  = vec2(noise1, noise2) * 0.03;
       disp += vec2(noise3, noise4) * 0.005;

  disp.x += sin((refPos.x * 20.0) + (time * 4.0)) * 0.02 * clamp(dist, 0.0, 1.0);
  disp.y += cos((refPos.y * 20.0) + (time * 3.0)) * 0.02 * clamp(dist, 0.0, 1.0);

  // Damp the wander as the shape forms. At full strength the noise smears
  // the letterforms into an unreadable blur.
  disp *= mix(1.0, 0.12, m);

  pos -= (uRingPos - (currentPos + disp)) * pow(max(t2, 0.0), 0.75)
         * uRingDisplacement * mix(1.0, 0.35, m);

  scale += (t - scale) * 0.2;

  vec2 finalPos = currentPos + disp + (pos * 0.25);

  fragColor = vec4(finalPos, scale, pFrame.w * 0.5 + scale * 0.25);
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
uniform float uMorph;

out vec4 fragColor;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.08, d);
  // The assembled glyph has to carry against a dark card with copy on top
  // of it, so it gets a good deal more presence than the resting cloud.
  a *= clamp(vScale, 0.0, 1.0) * mix(uAlpha, uAlpha * 2.4, uMorph);
  if (a <= 0.002) discard;

  // Shift toward the accent as the shape assembles, so the word arrives
  // with its own colour rather than just brightening.
  vec3 base = mix(uColor, uAccent, smoothstep(0.72, 1.0, vSeed));
  vec3 c = mix(base, uAccent, uMorph * 0.55);

  fragColor = vec4(c * a, a);
}
`

export default function MorphingParticles({
  text,
  hoverTargetRef,
  count = 14000,
  className,
}: MorphingParticlesProps) {
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
    if (!gl) return
    if (!gl.getExtension('EXT_color_buffer_float')) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /* ── layouts: scattered cloud, and the assembled word ─────────────── */

    // The card is wider than tall, so the scattered field spans a wider x.
    const fieldX = 1.7
    const area = fieldX * 2 * FIELD_Y * 2
    const minDistance = Math.sqrt(area / (count / 0.75))
    const scattered = poissonDisc({
      width: fieldX * 2,
      height: FIELD_Y * 2,
      minDistance,
    })

    const size = Math.floor(Math.sqrt(scattered.length))
    const total = size * size
    if (total === 0) return

    const shape = textToPoints(text, { count: total })
    // No glyph coverage (missing font, zero-width string) means nothing to
    // morph into — fall back to leaving the cloud scattered.
    const hasShape = shape.length > 0

    const homes = new Float32Array(total * 4)
    const targets = new Float32Array(total * 4)
    const uvs = new Float32Array(total * 2)
    const seeds = new Float32Array(total)

    for (let i = 0; i < total; i++) {
      const [sx, sy] = scattered[i]
      homes[i * 4 + 0] = sx - fieldX
      homes[i * 4 + 1] = sy - FIELD_Y

      if (hasShape) {
        // Cycle if the raster yielded fewer points than particles, with a
        // little jitter so duplicates do not stack into one bright dot.
        const s = shape[i % shape.length]
        const dup = Math.floor(i / shape.length)
        const j = dup === 0 ? 0 : 0.012
        targets[i * 4 + 0] = s[0] + (Math.random() - 0.5) * j
        targets[i * 4 + 1] = s[1] + (Math.random() - 0.5) * j
      } else {
        targets[i * 4 + 0] = homes[i * 4 + 0]
        targets[i * 4 + 1] = homes[i * 4 + 1]
      }

      uvs[i * 2 + 0] = ((i % size) + 0.5) / size
      uvs[i * 2 + 1] = (Math.floor(i / size) + 0.5) / size
      seeds[i] = Math.random()
    }

    /* ── GL resources ─────────────────────────────────────────────────── */

    const refTex = createStateTexture(gl, size, homes)
    const targetTex = createStateTexture(gl, size, targets)
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
      console.warn('MorphingParticles: shader setup failed, skipping', err)
      return
    }

    const su = (n: string) => gl.getUniformLocation(simProg, n)
    const ru = (n: string) => gl.getUniformLocation(renderProg, n)

    const simU = {
      uPosition: su('uPosition'),
      uPosRefs: su('uPosRefs'),
      uPosTarget: su('uPosTarget'),
      uRingPos: su('uRingPos'),
      uTexSize: su('uTexSize'),
      uTime: su('uTime'),
      uMorph: su('uMorph'),
      uRingRadius: su('uRingRadius'),
      uRingWidth: su('uRingWidth'),
      uRingWidth2: su('uRingWidth2'),
      uRingDisplacement: su('uRingDisplacement'),
    }
    const renderU = {
      uPosition: ru('uPosition'),
      uParticleScale: ru('uParticleScale'),
      uPixelRatio: ru('uPixelRatio'),
      uAspect: ru('uAspect'),
      uColor: ru('uColor'),
      uAccent: ru('uAccent'),
      uAlpha: ru('uAlpha'),
      uMorph: ru('uMorph'),
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

    const css = getComputedStyle(document.documentElement)
    const color = hexToRgb((css.getPropertyValue('--color-text') || '#e9e9ed').trim())
    const accent = hexToRgb((css.getPropertyValue('--color-accent') || '#9184d9').trim())

    /* ── sizing ───────────────────────────────────────────────────────── */

    let dpr = 1
    let aspect = 1
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      aspect = rect.width / rect.height
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    /* ── hover + pointer ──────────────────────────────────────────────── */

    const hoverEl: HTMLElement = hoverTargetRef?.current ?? canvas.parentElement ?? canvas

    const ring = { x: 0, y: 0 }
    const pointer = { x: 0, y: 0 }
    let hovering = false
    let morph = 0

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = (((e.clientX - rect.left) / rect.width) * 2 - 1) * aspect
      pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    }
    const onEnter = () => {
      hovering = true
    }
    const onLeave = () => {
      hovering = false
    }

    hoverEl.addEventListener('pointerenter', onEnter)
    hoverEl.addEventListener('pointerleave', onLeave)
    hoverEl.addEventListener('pointermove', onMove, { passive: true })

    let visible = true
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    })
    io.observe(canvas)

    /* ── frame loop ───────────────────────────────────────────────────── */

    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
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

      const target = hovering && hasShape ? 1 : 0
      const ease = 1 - Math.pow(1 - MORPH_EASE, dt * 60)
      morph += (target - morph) * ease

      // Park the ring off-canvas when not hovering so it does not brighten
      // a corner of a card nobody is pointing at.
      const rx = hovering ? pointer.x : 0
      const ry = hovering ? pointer.y : -3
      const rEase = 1 - Math.pow(1 - 0.16, dt * 60)
      ring.x += (rx - ring.x) * rEase
      ring.y += (ry - ring.y) * rEase

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
      gl.activeTexture(gl.TEXTURE2)
      gl.bindTexture(gl.TEXTURE_2D, targetTex)
      gl.uniform1i(simU.uPosTarget, 2)

      gl.uniform2f(simU.uRingPos, ring.x, ring.y)
      gl.uniform2f(simU.uTexSize, size, size)
      gl.uniform1f(simU.uTime, time)
      gl.uniform1f(simU.uMorph, morph)
      gl.uniform1f(simU.uRingRadius, RING_RADIUS)
      gl.uniform1f(simU.uRingWidth, RING_WIDTH)
      gl.uniform1f(simU.uRingWidth2, RING_WIDTH_2)
      gl.uniform1f(simU.uRingDisplacement, RING_DISPLACEMENT)

      gl.drawArrays(gl.TRIANGLES, 0, 3)

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

      gl.uniform1f(renderU.uParticleScale, (canvas.width / dpr / 2000) * 2.2)
      gl.uniform1f(renderU.uPixelRatio, dpr)
      gl.uniform1f(renderU.uAspect, aspect)
      gl.uniform3f(renderU.uColor, color[0], color[1], color[2])
      gl.uniform3f(renderU.uAccent, accent[0], accent[1], accent[2])
      gl.uniform1f(renderU.uAlpha, 0.75)
      gl.uniform1f(renderU.uMorph, morph)

      gl.drawArrays(gl.POINTS, 0, total)
      gl.bindVertexArray(null)

      ;[texA, texB] = [texB, texA]
      ;[fboA, fboB] = [fboB, fboA]
    }

    raf = requestAnimationFrame(step)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      hoverEl.removeEventListener('pointerenter', onEnter)
      hoverEl.removeEventListener('pointerleave', onLeave)
      hoverEl.removeEventListener('pointermove', onMove)

      gl.deleteTexture(refTex)
      gl.deleteTexture(targetTex)
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
  }, [text, count, hoverTargetRef])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
