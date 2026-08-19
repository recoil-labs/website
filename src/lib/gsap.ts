import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollSmoother } from 'gsap/ScrollSmoother'

/* Single registration point. Importing a plugin more than once is harmless,
   but registering from each component means the order the components happen
   to mount decides whether ScrollSmoother sees ScrollTrigger. Do it here. */
gsap.registerPlugin(ScrollTrigger, ScrollSmoother)

export { gsap, ScrollTrigger, ScrollSmoother }

/**
 * Runs `setup` inside a gsap.context scoped to `scope`, and reverts it on
 * cleanup — which kills the tweens *and* the ScrollTriggers they created,
 * and restores any inline styles GSAP wrote. Without this, React's double
 * mount in StrictMode leaves a duplicate ScrollTrigger behind for every one
 * it creates, and pinned sections end up with stacked spacers.
 *
 * Returns the cleanup directly, so effects can `return useGsap(...)`.
 */
export function createGsapContext(
  scope: Element | null,
  setup: (self: gsap.Context) => void,
) {
  if (!scope) return () => {}
  const ctx = gsap.context(setup, scope)
  return () => ctx.revert()
}
