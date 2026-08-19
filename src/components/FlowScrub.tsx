import { useLayoutEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion'

/** Scroll distance the section stays pinned for, in px. */
const SCRUB_LENGTH = 620
/** How far the playhead lags the scrollbar, in seconds. */
const SCRUB_EASE = 0.9

/**
 * Intent → Intelligence → Execution, advanced by the scrollbar.
 *
 * The section pins in the middle of the viewport and the sequence plays out
 * under the reader's own scrolling: each connector draws left to right, and
 * the stage it arrives at comes up to full weight behind it. Scrubbing the
 * progression rather than autoplaying it is the point — the copy above says
 * intent becomes execution, and the reader is the one moving it along.
 *
 * Every animated property starts from its *finished* value in CSS and is
 * pushed back to its start by `gsap.set` here. If this effect never runs —
 * reduced motion, a JS failure, a crawler — the flow renders complete rather
 * than stranded half-drawn.
 */
export default function FlowScrub() {
  const root = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const el = root.current
    if (!el) return

    const lines = gsap.utils.toArray<HTMLElement>('.flow-line', el)
    // The first stage is already true when the section arrives; only the
    // two it leads to are held back.
    const pending = gsap.utils.toArray<HTMLElement>('.flow-step', el).slice(1)

    gsap.set(lines, { scaleX: 0, transformOrigin: 'left center' })
    gsap.set(pending, { opacity: 0.28 })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: 'center center',
        end: `+=${SCRUB_LENGTH}`,
        pin: true,
        scrub: SCRUB_EASE,
        // Smooth scrolling means the pin would otherwise engage a frame
        // late and visibly jump. This pins slightly early instead.
        anticipatePin: 1,
      },
    })

    tl.to(lines[0], { scaleX: 1, ease: 'none', duration: 0.3 })
      .to(pending[0], { opacity: 1, ease: 'none', duration: 0.16 }, '-=0.06')
      .to(lines[1], { scaleX: 1, ease: 'none', duration: 0.3 })
      .to(pending[1], { opacity: 1, ease: 'none', duration: 0.16 }, '-=0.06')

    /* Torn down by hand rather than through gsap.context, because order
       matters here and context does not guarantee it: a pinned trigger wraps
       its element in a `.pin-spacer` div, and only `kill(true)` unwraps it.
       Context reverts the trigger first and calls any cleanup afterwards, by
       which point `tl.scrollTrigger` is already null and the spacer is
       stranded — StrictMode's second mount then pins that leftover spacer
       instead of the flow, nesting the two and collapsing the section. */
    return () => {
      tl.scrollTrigger?.kill(true)
      tl.kill()
      gsap.set([...lines, ...pending], { clearProps: 'all' })
    }
  }, [])

  return (
    <div className="flow-pin" ref={root}>
      <div className="flow">
        <span className="flow-step">Intent</span>
        <span className="flow-line" aria-hidden="true" />
        <span className="flow-step">Intelligence</span>
        <span className="flow-line flow-line-delayed" aria-hidden="true" />
        <span className="flow-step flow-step-end">Execution</span>
      </div>
    </div>
  )
}
