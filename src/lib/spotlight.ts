import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from './motion'

/**
 * Tracks the cursor across every `[data-spotlight]` element inside the
 * returned ref, publishing its position to each as `--mx` / `--my` so CSS
 * can put a highlight under it.
 *
 * One delegated listener on the container rather than one per card: the
 * grid can grow without the handler count growing with it, and cards that
 * mount later are covered without re-binding anything.
 *
 * The read is deliberately per-event rather than cached. A card's box moves
 * whenever the page scrolls — ScrollSmoother transforms the content — so a
 * cached rect would need invalidating on scroll anyway, and pointer events
 * only fire while the cursor is actually over the section.
 */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const root = ref.current
    // Reduced motion keeps the static hover state CSS provides and never
    // moves the highlight — a glow chasing the cursor is motion too.
    if (!root || prefersReducedMotion()) return

    const onPointerMove = (event: PointerEvent) => {
      // Touch has no hover; a tap would strand the highlight where it fell.
      if (event.pointerType === 'touch') return
      const card = (event.target as HTMLElement).closest<HTMLElement>(
        '[data-spotlight]',
      )
      if (!card) return
      const rect = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`)
      card.style.setProperty('--my', `${event.clientY - rect.top}px`)
    }

    root.addEventListener('pointermove', onPointerMove)
    return () => root.removeEventListener('pointermove', onPointerMove)
  }, [])

  return ref
}
