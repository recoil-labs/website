import { useLayoutEffect } from 'react'
import { ScrollSmoother, ScrollTrigger } from './gsap'
import { prefersReducedMotion } from './motion'

/** Seconds the content takes to catch up with the scrollbar. */
const SMOOTH = 1.1
/** Where an anchor target comes to rest, clearing the fixed nav. */
const ANCHOR_POSITION = 'top 88px'

/**
 * Installs ScrollSmoother on the `#smooth-wrapper` / `#smooth-content` pair
 * that App renders, and routes in-page anchor links through it.
 *
 * ScrollSmoother works by leaving the scrollbar native — the body keeps the
 * content's full height — and transforming `#smooth-content` to lag behind
 * it. Two consequences shape the rest of the app:
 *
 *  - A transformed ancestor makes `position: fixed` and `sticky` resolve
 *    against the content instead of the viewport, so the nav lives *outside*
 *    the wrapper (see App.tsx) rather than inside it.
 *  - Native anchor jumps land against untransformed layout positions, which
 *    are off by however far the content is currently lagging. Anchors are
 *    intercepted below and handed to `smoother.scrollTo` instead.
 *
 * Returns nothing; the effect cleans itself up.
 */
export function useSmoothScroll() {
  useLayoutEffect(() => {
    // Reduced motion gets the browser's own scrolling, untouched. Bailing
    // before create() leaves the wrapper/content divs as plain boxes, which
    // lay out exactly as if they weren't there.
    if (prefersReducedMotion()) return

    const smoother = ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: SMOOTH,
      // Leave touch scrolling native — momentum scrolling is already smooth
      // there, and doubling it up feels like drag.
      smoothTouch: 0,
      effects: true,
      ignoreMobileResize: true,
    })

    const onAnchorClick = (event: MouseEvent) => {
      // Let modified clicks (new tab, download, …) behave normally.
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>(
        'a[href^="#"]',
      )
      if (!anchor) return

      const id = anchor.getAttribute('href')?.slice(1)
      if (!id) return
      const target = document.getElementById(id)
      if (!target) return

      event.preventDefault()
      smoother.scrollTo(target, true, ANCHOR_POSITION)
      // The URL still ought to reflect where we are, but pushing the hash
      // would re-trigger the browser's own jump — replace instead.
      history.replaceState(null, '', `#${id}`)
    }

    document.addEventListener('click', onAnchorClick)

    // Web fonts land after first paint and change every heading's height,
    // which moves every trigger below them. Re-measure once they're in.
    document.fonts?.ready.then(() => ScrollTrigger.refresh())

    return () => {
      document.removeEventListener('click', onAnchorClick)
      smoother.kill()
    }
  }, [])
}
