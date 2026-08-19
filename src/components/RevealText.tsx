import { useLayoutEffect, useRef } from 'react'
import type { ElementType, ReactNode } from 'react'
import { SplitText } from 'gsap/SplitText'
import { gsap, createGsapContext } from '../lib/gsap'
import { prefersReducedMotion } from '../lib/motion'

gsap.registerPlugin(SplitText)

interface RevealTextProps {
  children: ReactNode
  /** Tag to render. Defaults to a span so the caller owns the semantics. */
  as?: ElementType
  className?: string
  /** Seconds between consecutive words. */
  stagger?: number
}

const DURATION = 0.9
const EASE = 'power3.out'

/**
 * Reveals its text one word at a time as it scrolls into view — each word
 * rising from below its own line and fading up.
 *
 * The words are clipped by per-line wrappers (`mask: 'lines'`), so a word
 * travelling up appears to slide out from behind the line above it rather
 * than fading in mid-air. That only reads correctly if the split survives
 * reflow, hence `autoSplit`: SplitText re-splits on resize, and the
 * `onSplit` return hands the new tween back so it replaces the old one.
 *
 * Pass plain text as children. The split rewrites this element's innerHTML,
 * so anything React would later re-render inside it will be clobbered.
 */
export default function RevealText({
  children,
  as: Tag = 'span',
  className,
  stagger = 0.045,
}: RevealTextProps) {
  const ref = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    // Reduced motion keeps the text exactly as authored — no split, no
    // wrappers, nothing for a screen reader to have to reassemble.
    if (prefersReducedMotion()) return
    const el = ref.current
    if (!el) return

    /* Headings the viewport has already passed are left alone entirely.
       Splitting them would only set up an entrance that has no chance to
       play — and an unplayed `from` tween strands the words at their start
       values, which is a heading that never appears. Same failure the
       scroll reveals had on anchor jumps; here the cheapest fix is simply
       not to animate what the reader has already arrived at. */
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return

    return createGsapContext(el, () => {
      SplitText.create(el, {
        type: 'words,lines',
        mask: 'lines',
        // Restores the original markup on revert, and labels the element so
        // assistive tech reads the sentence rather than the word soup.
        aria: 'auto',
        /* No `autoSplit`. Re-splitting mid-flight kills the tween that is
           running and builds a new one whose ScrollTrigger has already been
           passed, so it never plays — the words freeze part-lit, at
           whatever opacity the stagger had reached, inside line masks
           measured for a width the text no longer occupies. Splitting once
           and reverting below removes the whole failure mode. */
        onSplit: (self) =>
          gsap.from(self.words, {
            yPercent: 110,
            opacity: 0,
            duration: DURATION,
            ease: EASE,
            stagger,
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              once: true,
            },
            /* The split exists only to stage the entrance. Once that has
               played, put the original markup back: no clipping wrappers
               left to go stale on the next reflow, and no split for a
               resize to have an opinion about. */
            onComplete: () => self.revert(),
          }),
      })
    })
  }, [stagger])

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}
