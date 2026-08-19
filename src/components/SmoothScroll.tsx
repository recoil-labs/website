import { useSmoothScroll } from '../lib/smoothScroll'

/**
 * Renders nothing; exists only to own the ScrollSmoother lifecycle.
 *
 * It has to be App's *first* child, because layout effects fire in tree
 * order — first sibling's subtree before the next — and every scroll-driven
 * component in the page depends on the smoother being on both sides of it:
 *
 *  - On mount, a ScrollTrigger that pins (FlowScrub) has to be created while
 *    the smoother already owns the scroll context. Created before, it pins
 *    against the native scroller, and the handover strands its `.pin-spacer`
 *    wrapper — which React's StrictMode double mount then pins *again*,
 *    nesting the spacers and collapsing the section to the wrong height.
 *  - On unmount, cleanups run in that same order, so the smoother is killed
 *    first and the DOM is plain again by the time the pins unwind.
 *
 * A hook called directly in App would run *after* its children's, which is
 * exactly backwards. Hence a component, and hence its position.
 */
export default function SmoothScroll() {
  useSmoothScroll()
  return null
}
