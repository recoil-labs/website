import { useEffect, useRef, useState } from 'react'

interface MeshCanvasProps {
  /** Drift and pulse the nodes. Forced off when the OS asks for reduced motion. */
  motion?: boolean
  /** Node count at a 1200px-wide canvas; scales down on narrower ones. */
  density?: number
  className?: string
}

/* How present the mesh reads. Every value scales with an edge's "tightness"
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

/**
 * The hero's constellation: a drifting node mesh with points of light
 * travelling the shortest edges. Painted on a canvas rather than in the DOM
 * because the edge set is recomputed every frame.
 */
export default function MeshCanvas({
  motion = true,
  density = 58,
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

    interface Node {
      x: number
      y: number
      vx: number
      vy: number
      r: number
      phase: number
    }
    let nodes: Node[] = []

    const animate = motion && !reduced.matches

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
    }

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)

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

      ctx.lineWidth = 1
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 > LINK_DISTANCE * LINK_DISTANCE) continue

          // Edges fade out as they stretch.
          const f = 1 - Math.sqrt(d2) / LINK_DISTANCE
          ctx.strokeStyle = `rgba(145,132,217,${(f * EDGE_ALPHA).toFixed(3)})`
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()

          // Only the tightest edges carry a travelling point of light.
          if (f > SPARK_THRESHOLD) {
            const p = (t / 3600 + (i * 7 + j * 13) * 0.061) % 1
            const px = b.x + (a.x - b.x) * p
            const py = b.y + (a.y - b.y) * p
            const g = ctx.createRadialGradient(px, py, 0, px, py, SPARK_RADIUS)
            g.addColorStop(0, `rgba(210,206,253,${(f * SPARK_ALPHA).toFixed(3)})`)
            g.addColorStop(1, 'rgba(210,206,253,0)')
            ctx.fillStyle = g
            ctx.beginPath()
            ctx.arc(px, py, SPARK_RADIUS, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      for (const n of nodes) {
        const pulse = animate ? 0.5 + 0.5 * Math.sin(t / 1400 + n.phase) : 0.7
        ctx.fillStyle = `rgba(180,171,252,${(NODE_ALPHA + pulse * NODE_PULSE).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fill()
      }

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

    // Re-run the effect when the OS motion preference flips.
    const onPreferenceChange = () => setPreference((n) => n + 1)
    reduced.addEventListener('change', onPreferenceChange)

    return () => {
      if (raf !== null) cancelAnimationFrame(raf)
      observer?.disconnect()
      reduced.removeEventListener('change', onPreferenceChange)
    }
  }, [motion, density, preference])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
