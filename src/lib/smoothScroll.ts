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

    /** Scrolls to whatever `#id` the URL currently names, if it names one. */
    const scrollToHash = (smooth: boolean) => {
      const id = location.hash.slice(1)
      if (!id) return
      const target = document.getElementById(id)
      if (!target) return
      smoother.scrollTo(target, smooth, ANCHOR_POSITION)
    }

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

    /* A hash the page was *loaded* with never reaches the click handler
       above, and the browser's own jump for it does not survive
       ScrollSmoother taking the scroll over — so `/#writing` would land at
       the top of the page with the anchor ignored entirely. The jump has to
       be reissued here, through the smoother, once measurements are good. */
    const onHashChange = () => scrollToHash(false)
    window.addEventListener('hashchange', onHashChange)

    /* Stop the browser restoring a scroll position of its own on reload:
       it restores against untransformed layout, which lands somewhere
       unrelated and then fights the jump below. */
    const previousRestoration = history.scrollRestoration
    history.scrollRestoration = 'manual'

    /* Web fonts land after first paint and change every heading's height,
       which moves every trigger below them. Re-measure once they're in —
       and only then act on the hash, since jumping to a target measured
       against pre-font layout is what puts it off by a section. The
       fallback keeps this working where `document.fonts` is unavailable,
       rather than silently never firing. */
    const fontsReady = document.fonts?.ready ?? Promise.resolve()
    fontsReady.then(() => {
      ScrollTrigger.refresh()
      scrollToHash(false)
    })

    return () => {
      document.removeEventListener('click', onAnchorClick)
      window.removeEventListener('hashchange', onHashChange)
      history.scrollRestoration = previousRestoration
      smoother.kill()
    }
  }, [])
}
