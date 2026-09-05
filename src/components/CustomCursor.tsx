import { useEffect, useRef } from 'react'

import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion'

/* ── what this is ─────────────────────────────────────────────────────────
   A cursor that only exists inside one element. On enter the native cursor
   is hidden and a custom element scales up in its place; on leave it scales
   away and the native cursor comes back.

   Scoped rather than global on purpose. A site-wide custom cursor has to
   handle every input, link and scrollbar on the page and usually ends up
   worse than the real one — confining it to a few deliberate surfaces gets
   the effect without the cost.

   Exposed as a hook rather than a wrapper component so it adds no DOM. The
   product cards are direct grid children, and an extra wrapper div would
   break the grid.

   The follow uses GSAP quickTo rather than a tween per pointermove:
   quickTo reuses a single tween and retargets it, so a fast drag does not
   allocate a tween per frame. */

export function useScopedCursor<W extends HTMLElement, D extends HTMLElement>() {
  const wrapRef = useRef<W>(null)
  const dotRef = useRef<D>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const dot = dotRef.current
    if (!wrap || !dot) return

    // Touch has no hover state — the cursor would appear on tap and stick.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (prefersReducedMotion()) return

    gsap.set(dot, { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 })

    const xTo = gsap.quickTo(dot, 'x', { duration: 0.35, ease: 'power2.out' })
    const yTo = gsap.quickTo(dot, 'y', { duration: 0.35, ease: 'power2.out' })

    let active = false

    const place = (e: PointerEvent, instant = false) => {
      const rect = wrap.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      if (instant) gsap.set(dot, { x, y })
      else {
        xTo(x)
        yTo(y)
      }
    }

    const onEnter = (e: PointerEvent) => {
      if (active) return
      active = true
      wrap.style.cursor = 'none'
      // Jump to the entry point before fading in, or the cursor visibly
      // flies in from wherever it was last left.
      place(e, true)
      gsap.to(dot, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' })
    }

    const onLeave = () => {
      if (!active) return
      active = false
      wrap.style.cursor = ''
      gsap.to(dot, { scale: 0, opacity: 0, duration: 0.2, ease: 'power2.in' })
    }

    const onMove = (e: PointerEvent) => {
      if (active) place(e)
    }

    wrap.addEventListener('pointerenter', onEnter)
    wrap.addEventListener('pointerleave', onLeave)
    wrap.addEventListener('pointermove', onMove, { passive: true })

    return () => {
      wrap.removeEventListener('pointerenter', onEnter)
      wrap.removeEventListener('pointerleave', onLeave)
      wrap.removeEventListener('pointermove', onMove)
      wrap.style.cursor = ''
      gsap.killTweensOf(dot)
    }
  }, [])

  return { wrapRef, dotRef }
}
