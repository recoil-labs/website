import { useLayoutEffect } from 'react'
import type { CSSProperties } from 'react'

/**
 * Reveals every `[data-reveal]` element once it scrolls into view, by adding
 * `.is-revealed`. Call once, from the app root.
 *
 * The hidden state is gated behind a `reveal-ready` class this hook puts on
 * <html>, so if the script never runs the content stays visible rather than
 * being stranded at opacity 0. useLayoutEffect rather than useEffect: the
 * class has to land before the first paint or the page flashes in and out.
 */
export function useScrollReveal() {
  useLayoutEffect(() => {
    const root = document.documentElement
    const targets = document.querySelectorAll<HTMLElement>('[data-reveal]')
    if (!targets.length) return

    root.classList.add('reveal-ready')

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target) // reveal once, never re-hide
        }
      },
      // Fires a little before the element is fully on screen, so the motion
      // reads as the page settling rather than as a reaction to the scroll.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.1 },
    )

    for (const target of targets) observer.observe(target)

    /* Catch-up sweep, for elements the viewport *jumps over*.
       An IntersectionObserver only reports transitions it actually observes,
       and an anchor jump — clicking "Build with us", or loading straight
       into `/#build` — moves the page far enough in one step that whole
       sections are never on screen for an observed frame. Those elements
       stay at opacity 0 permanently: the section is simply invisible, and
       scrolling back does not recover it because the observer has already
       passed them by.

       So geometry is checked directly here rather than trusted to the
       observer's bookkeeping. The threshold matches the observer's own
       rootMargin, so on ordinary scrolling the two agree and this changes
       nothing about how the reveal feels — it only backfills the jumps. */
    let queued = false
    const sweep = () => {
      queued = false
      const limit = window.innerHeight * 0.88
      for (const target of targets) {
        if (target.classList.contains('is-revealed')) continue
        if (target.getBoundingClientRect().top >= limit) continue
        target.classList.add('is-revealed')
        observer.unobserve(target)
      }
    }

    // Coalesced to one check per frame: with smooth scrolling, scroll events
    // arrive far faster than the layout reads above are worth repeating.
    const onScroll = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(sweep)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    // Covers a hash already in the URL on first load, where the jump can
    // land before this effect ever runs.
    requestAnimationFrame(sweep)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      root.classList.remove('reveal-ready')
    }
  }, [])
}

/** Stagger helper: `style={revealDelay(index * 90)}` on a `[data-reveal]`. */
export function revealDelay(ms: number): CSSProperties {
  return { '--reveal-delay': `${ms}ms` } as CSSProperties
}
