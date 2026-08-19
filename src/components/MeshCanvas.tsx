import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from '../lib/gsap'

interface MeshCanvasProps {
  /** Drift and pulse the field. Forced off when the OS asks for reduced motion. */
  motion?: boolean
  /** Constellation node count at a 1200px-wide canvas; scales with width. */
  density?: number
  /** Dash count at a 1200×640 canvas; scales with area. */
  moteDensity?: number
  className?: string
}

/* ── constellation ────────────────────────────────────────────────────────
   How present the mesh reads. Every value scales with an edge's "tightness"
   (1 at zero length, 0 at LINK_DISTANCE), so the field stays denser and
   brighter near clusters and fades out between them. */

/** Longest edge that still gets drawn, in CSS pixels. */
const LINK_DISTANCE = 215
/** Peak opacity of the shortest edges. */
const EDGE_ALPHA = 0.34
/** Node opacity floor, and how much the pulse adds on top. */
const NODE_ALPHA = 0.3
const NODE_PULSE = 0.45
/** Edge tightness that earns a travelling point of light, and its size/peak. */
const SPARK_THRESHOLD = 0.45
const SPARK_RADIUS = 9
const SPARK_ALPHA = 0.78

/* ── dash field ───────────────────────────────────────────────────────────
   The dense layer behind the constellation: hundreds of short oriented
   strokes rather than dots, which is what gives the field its grain. Each
   one carries a depth, and depth drives its size, its opacity and how far
   it parallaxes — so the layer reads as a volume rather than as confetti. */

/** Dash length in CSS pixels, at the far and near ends of the depth range. */
const DASH_LEN_FAR = 3
const DASH_LEN_NEAR = 7
/** Opacity at the far and near ends. */
const MOTE_ALPHA_FAR = 0.16
const MOTE_ALPHA_NEAR = 0.5
/** Stroke width per depth band, far to near. */
const BAND_WIDTHS = [0.9, 1.3, 1.8]
/** The purple family the dashes are drawn from, far to near. */
const MOTE_COLORS = [
  [154, 142, 226],
  [186, 176, 250],
  [214, 208, 253],
] as const

/** Milliseconds the dashes take to fly from scattered to formation. */
const ASSEMBLE_MS = 2000
/** How far a dash starts from its formation spot, as a fraction of canvas. */
const SCATTER = 0.55
/** Peak drift excursion in CSS pixels, for the nearest dashes. */
const DRIFT = 26
/** Extra outward push, in px, once the hero is fully scrolled past. */
const DISPERSE = 190
/** Upward parallax of the nearest dashes across the hero, in px. */
const PARALLAX = 120

/* ── ring ─────────────────────────────────────────────────────────────────
   A travelling annulus that displaces whatever it passes through, rather
   than a bubble the cursor clears around itself. Particles are pushed only
   where they fall inside the band, so the disturbance is a crest with calm
   on both sides of it.

   Three things matter more than the numbers. The ring is always live — it
   wanders on its own when nothing is hovering, so the field is never inert.
   Its radius breathes on two detuned sines, so it never sits still even
   when the cursor does. And it is eased *very* slowly toward its target, so
   it trails the pointer by the better part of a second: the lag is what
   stops it reading as a cursor decoration and starts it reading as
   something moving through the field on its own. */

/** Ring radius at rest, in CSS pixels. */
const RING_RADIUS = 150
/** Amplitude of the two sines that breathe the radius, in CSS pixels. */
const RING_BREATH_SLOW = 26
const RING_BREATH_FAST = 17
/** Half-width of the band that actually displaces, in CSS pixels. */
const RING_WIDTH = 40
/** Peak displacement, at the crest of the band. */
const RING_DISPLACEMENT = 40
/** Constellation nodes yield less than dashes — the mesh should hold shape. */
const NODE_FORCE_SCALE = 0.62
/** Idle wander of the ring, as a fraction of the canvas half-extent. */
const AMBIENT_X = 0.2
const AMBIENT_Y = 0.1
/** How much of that wander survives while the cursor is driving it. */
const AMBIENT_WITH_CURSOR = 0.5
/** Fraction of the gap the ring closes each frame. Heavy on purpose. */
const RING_EASE = 0.02
/** Fraction of the gap the cursor's authority fades in/out by. */
const PRESENCE_EASE = 0.07

/** Ease used for the entrance — decisive at the start, settling at the end. */
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  phase: number
}

interface Mote {
  /** Formation position — where it belongs once assembled. */
  hx: number
  hy: number
  /** Where it flies in from. */
  sx: number
  sy: number
  /** 0 far, 1 near. Drives size, opacity, parallax and drift amplitude. */
  z: number
  angle: number
  len: number
  phase: number
  /** Index into the per-band-and-colour draw buckets. */
  bucket: number
}

/**
 * The hero's field: a dense layer of drifting dashes with a constellation of
 * linked nodes over it, and points of light travelling the shortest edges.
 *
 * Painted on a canvas rather than in the DOM because the edge set is
 * recomputed every frame and the dash count runs into the hundreds.
 *
 * The dashes fly in from scattered positions on load, then respond to the
 * scroll: they parallax upward and push outward as the hero leaves, so the
 * field disperses rather than simply scrolling away. Depth is faked with a
 * per-dash `z` — there is no 3D here, just size, opacity and parallax all
 * keyed off the same number, which is enough to read as one.
 *
 * Dashes are stroked in buckets — one `beginPath`/`stroke` pair per depth
 * band and colour, rather than per dash — because stroke state changes are
 * what actually cost on a canvas this dense. Nine draw calls, not six hundred.
 */
export default function MeshCanvas({
  motion = true,
  density = 58,
  moteDensity = 520,
  className,
}: MeshCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Bumped when the OS motion preference flips, to re-run the effect below.
  const [preference, setPreference] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    let raf: number | null = null
    let observer: ResizeObserver | null = null
    let w = 0
    let h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let nodes: Node[] = []
    let motes: Mote[] = []
    /* Each node's resolved on-screen position for the current frame, so the
       edge, spark and dot passes all agree on where a node is. */
    let drawX = new Float32Array(0)
    let drawY = new Float32Array(0)
    /** Mote indices grouped by bucket, so each bucket strokes in one pass. */
    let buckets: number[][] = []

    const animate = motion && !reduced.matches

    /* How far the hero has scrolled past, 0 to 1. Written by ScrollTrigger,
       read by the draw loop — deliberately a plain variable rather than
       state, since it changes every frame and must not re-render React. */
    let scrolled = 0
    /* Timestamp the entrance started, set on the first frame rather than at
       seed time so a canvas that mounts offscreen still animates in full. */
    let assembleStart: number | null = null

    /* Pointer and ring state. `target*` is the raw cursor, written by the
       event handler. `presence` is how much authority the cursor currently
       has over the ring, eased so that arriving and leaving are settles
       rather than snaps — note it no longer gates the effect, only steers
       it: the ring keeps wandering with no pointer anywhere near it. */
    let targetX = 0
    let targetY = 0
    let targetPresence = 0
    let presence = 0
    let ringX = 0
    let ringY = 0
    let ringRadius = RING_RADIUS

    /* Scratch for the displacement, written by `ringPush` and read
       immediately after. A pair of outer variables rather than a returned
       tuple: this runs once per particle per frame, and allocating ~600
       short-lived arrays every frame is exactly the kind of garbage a
       canvas loop should not be making. */
    let repelX = 0
    let repelY = 0

    const ringPush = (x: number, y: number, force: number) => {
      repelX = 0
      repelY = 0
      const dx = x - ringX
      const dy = y - ringY
      const d = Math.hypot(dx, dy) || 1
      // Distance from the *crest*, not from the centre. Inside the ring is
      // as undisturbed as outside it — only the band itself displaces.
      const band = 1 - Math.abs(d - ringRadius) / RING_WIDTH
      if (band <= 0) return
      const f = band * band * force
      repelX = (dx / d) * f
      repelY = (dy / d) * f
    }

    const seed = () => {
      const count = Math.max(14, Math.round(density * Math.min(1.4, w / 1200)))
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: Math.random() * 1.5 + 0.9,
        phase: Math.random() * Math.PI * 2,
      }))
      drawX = new Float32Array(count)
      drawY = new Float32Array(count)

      // Park the ring mid-canvas so its first frame is already somewhere
      // sensible, rather than easing in from the top-left corner.
      ringX = w / 2
      ringY = h / 2

      const moteCount = Math.round(
        moteDensity * Math.min(1.6, (w * h) / (1200 * 640)),
      )
      buckets = Array.from({ length: BAND_WIDTHS.length * MOTE_COLORS.length }, () => [])
      motes = Array.from({ length: moteCount }, (_, i) => {
        const hx = Math.random() * w
        const hy = Math.random() * h
        const z = Math.random()
        const band = Math.min(BAND_WIDTHS.length - 1, Math.floor(z * BAND_WIDTHS.length))
        const colour = Math.min(
          MOTE_COLORS.length - 1,
          Math.floor(Math.random() * MOTE_COLORS.length),
        )
        const bucket = band * MOTE_COLORS.length + colour
        buckets[bucket].push(i)
        return {
          hx,
          hy,
          // Scattered outward from the centre, so the entrance reads as the
          // field converging rather than as noise settling.
          sx: hx + (hx - w / 2) * SCATTER * (0.6 + Math.random()),
          sy: hy + (hy - h / 2) * SCATTER * (0.6 + Math.random()),
          z,
          angle: Math.random() * Math.PI,
          len: DASH_LEN_FAR + (DASH_LEN_NEAR - DASH_LEN_FAR) * z,
          phase: Math.random() * Math.PI * 2,
          bucket,
        }
      })
    }

    const drawMotes = (t: number, assemble: number) => {
      const cx = w / 2
      const cy = h / 2
      // Everything fades out together as the hero leaves, on top of each
      // dash's own depth-derived opacity.
      const exit = 1 - scrolled * 0.85

      for (let b = 0; b < buckets.length; b++) {
        const indices = buckets[b]
        if (!indices.length) continue

        const band = Math.floor(b / MOTE_COLORS.length)
        const [r, g, bl] = MOTE_COLORS[b % MOTE_COLORS.length]
        // One representative depth per band is enough for the stroke state;
        // the per-dash depth still drives position and length.
        const depth = (band + 0.5) / BAND_WIDTHS.length
        const alpha =
          (MOTE_ALPHA_FAR + (MOTE_ALPHA_NEAR - MOTE_ALPHA_FAR) * depth) *
          assemble *
          exit
        if (alpha <= 0.003) continue

        ctx.lineWidth = BAND_WIDTHS[band]
        ctx.strokeStyle = `rgba(${r},${g},${bl},${alpha.toFixed(3)})`
        ctx.beginPath()

        for (const i of indices) {
          const m = motes[i]
          // Fly in from the scatter position.
          let x = m.sx + (m.hx - m.sx) * assemble
          let y = m.sy + (m.hy - m.sy) * assemble

          if (animate) {
            // Nearer dashes drift further, which separates the layers.
            const amp = DRIFT * (0.25 + m.z)
            x += Math.sin(t / 4200 + m.phase) * amp
            y += Math.cos(t / 5100 + m.phase * 1.3) * amp * 0.7
          }

          // Scroll pushes the field outward from the centre and lifts it,
          // both scaled by depth so the near dashes lead.
          if (scrolled > 0) {
            const push = scrolled * DISPERSE * (0.3 + m.z)
            const dx = x - cx
            const dy = y - cy
            const d = Math.hypot(dx, dy) || 1
            x += (dx / d) * push
            y += (dy / d) * push - scrolled * PARALLAX * m.z
          }

          // The ring, applied last so it displaces the dash from wherever
          // everything else has already put it.
          ringPush(x, y, RING_DISPLACEMENT)
          x += repelX
          y += repelY

          const half = m.len / 2
          const ax = Math.cos(m.angle) * half
          const ay = Math.sin(m.angle) * half
          ctx.moveTo(x - ax, y - ay)
          ctx.lineTo(x + ax, y + ay)
        }

        ctx.stroke()
      }
    }

    const drawConstellation = (t: number) => {
      // The constellation rides the same exit as the dashes, a little softer.
      const exit = 1 - scrolled * 0.9
      if (exit <= 0.01) return

      for (const n of nodes) {
        if (animate) {
          n.x += n.vx
          n.y += n.vy
        }
        // Wrap at the edges so the field never thins out.
        if (n.x < -20) n.x = w + 20
        if (n.x > w + 20) n.x = -20
        if (n.y < -20) n.y = h + 20
        if (n.y > h + 20) n.y = -20
      }

      const lift = scrolled * PARALLAX * 0.55

      /* Resolve each node's on-screen position once, into `drawX`/`drawY`,
         before anything is painted. Edges, sparks and dots all read from
         these rather than from `n.x`/`n.y`, so a node the cursor has pushed
         takes its edges with it — computing the displacement separately in
         each pass would tear the mesh apart. The nodes' own coordinates stay
         untouched, so the interaction is a render offset and never
         accumulates into the drift. */
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        let x = n.x
        let y = n.y - lift
        ringPush(x, y, RING_DISPLACEMENT * NODE_FORCE_SCALE)
        x += repelX
        y += repelY
        drawX[i] = x
        drawY[i] = y
      }

      ctx.lineWidth = 1
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          // Linking is tested on the displaced positions too, not just drawn
          // from them — so pushing the cursor through the mesh genuinely
          // stretches edges past their limit and snaps them, rather than
          // sliding a fixed lattice around.
          const dx = drawX[i] - drawX[j]
          const dy = drawY[i] - drawY[j]
          const d2 = dx * dx + dy * dy
          if (d2 > LINK_DISTANCE * LINK_DISTANCE) continue

          // Edges fade out as they stretch.
          const f = 1 - Math.sqrt(d2) / LINK_DISTANCE
          ctx.strokeStyle = `rgba(145,132,217,${(f * EDGE_ALPHA * exit).toFixed(3)})`
          ctx.beginPath()
          ctx.moveTo(drawX[i], drawY[i])
          ctx.lineTo(drawX[j], drawY[j])
          ctx.stroke()

          // Only the tightest edges carry a travelling point of light.
          if (f > SPARK_THRESHOLD) {
            const p = (t / 3600 + (i * 7 + j * 13) * 0.061) % 1
            const px = drawX[j] + (drawX[i] - drawX[j]) * p
            const py = drawY[j] + (drawY[i] - drawY[j]) * p
            const g = ctx.createRadialGradient(px, py, 0, px, py, SPARK_RADIUS)
            const peak = (f * SPARK_ALPHA * exit).toFixed(3)
            g.addColorStop(0, `rgba(210,206,253,${peak})`)
            g.addColorStop(1, 'rgba(210,206,253,0)')
            ctx.fillStyle = g
            ctx.beginPath()
            ctx.arc(px, py, SPARK_RADIUS, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        const pulse = animate ? 0.5 + 0.5 * Math.sin(t / 1400 + n.phase) : 0.7
        const a = (NODE_ALPHA + pulse * NODE_PULSE) * exit
        ctx.fillStyle = `rgba(180,171,252,${a.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(drawX[i], drawY[i], n.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)

      /* Advance the ring. Frame-rate dependent by design: these are
         cosmetic lags, and a delta-time correction here would cost more
         than it buys.

         The target is a *sum*, not a blend — the cursor's offset from
         centre plus an ambient wobble that never fully switches off, only
         drops to half amplitude once the cursor takes over. That residual
         is what keeps the ring from feeling nailed to the pointer. */
      presence += (targetPresence - presence) * PRESENCE_EASE

      const ambient = 1 - (1 - AMBIENT_WITH_CURSOR) * presence
      const ambX = Math.sin(t / 2400) * AMBIENT_X * (w / 2) * ambient
      const ambY = Math.sin(t / 1800 + 21.028) * AMBIENT_Y * (h / 2) * ambient
      const wantX = w / 2 + (targetX - w / 2) * presence + ambX
      const wantY = h / 2 + (targetY - h / 2) * presence + ambY

      ringX += (wantX - ringX) * RING_EASE
      ringY += (wantY - ringY) * RING_EASE

      // Two detuned sines, so the crest is never the same size twice.
      ringRadius =
        RING_RADIUS +
        Math.sin(t / 1000) * RING_BREATH_SLOW +
        Math.cos(t / 333) * RING_BREATH_FAST

      if (assembleStart === null) assembleStart = t
      const assemble = animate
        ? easeOutCubic(Math.min(1, (t - assembleStart) / ASSEMBLE_MS))
        : 1

      // Dashes first: they are the ground the constellation sits on.
      drawMotes(t, assemble)
      drawConstellation(t)

      if (animate) raf = requestAnimationFrame(draw)
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      w = rect.width
      h = rect.height || 640
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
      // A resize clears the backing store, so a still frame has to be redrawn.
      if (!animate) draw(0)
    }

    resize()
    observer = new ResizeObserver(resize)
    observer.observe(canvas)
    if (animate) raf = requestAnimationFrame(draw)

    /* Scroll response. The hero is the canvas's own parent, and the trigger
       only writes a number — no tween, no pinning — so it stays cheap and
       needs no teardown beyond killing the trigger. */
    const hero = canvas.parentElement
    const trigger =
      animate && hero
        ? ScrollTrigger.create({
            trigger: hero,
            start: 'top top',
            end: 'bottom top',
            onUpdate: (self) => {
              scrolled = self.progress
            },
          })
        : null

    /* Pointer response. Bound to the hero rather than the canvas, because
       the canvas is `pointer-events: none` and sits under the copy — events
       land on the headline and buttons and bubble up to here, which is what
       lets the field react while the cursor is over the text.

       Skipped entirely when not animating: without a running frame loop
       there is nothing to ease the values, and a touch pointer has no hover
       to speak of. */
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      // One layout read per move, and only while the cursor is over the
      // hero. Caching this would mean invalidating it on resize *and* on
      // every scroll frame, since ScrollSmoother transforms the content.
      const rect = canvas.getBoundingClientRect()
      targetX = event.clientX - rect.left
      targetY = event.clientY - rect.top
      // No snap-to-cursor on arrival: the ring is meant to travel to the
      // pointer at its own pace, and jumping it there on the first move is
      // exactly the tethered feel the slow ease exists to avoid.
      targetPresence = 1
    }

    const onPointerLeave = () => {
      targetPresence = 0
    }

    if (animate && hero) {
      hero.addEventListener('pointermove', onPointerMove)
      hero.addEventListener('pointerleave', onPointerLeave)
    }

    // Re-run the effect when the OS motion preference flips.
    const onPreferenceChange = () => setPreference((n) => n + 1)
    reduced.addEventListener('change', onPreferenceChange)

    return () => {
      if (raf !== null) cancelAnimationFrame(raf)
      observer?.disconnect()
      trigger?.kill()
      hero?.removeEventListener('pointermove', onPointerMove)
      hero?.removeEventListener('pointerleave', onPointerLeave)
      reduced.removeEventListener('change', onPreferenceChange)
    }
  }, [motion, density, moteDensity, preference])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
