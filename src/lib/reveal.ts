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

    return () => {
      observer.disconnect()
      root.classList.remove('reveal-ready')
    }
  }, [])
}

/** Stagger helper: `style={revealDelay(index * 90)}` on a `[data-reveal]`. */
export function revealDelay(ms: number): CSSProperties {
  return { '--reveal-delay': `${ms}ms` } as CSSProperties
}
