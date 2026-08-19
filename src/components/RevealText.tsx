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

    return createGsapContext(ref.current, () => {
      SplitText.create(ref.current, {
        type: 'words,lines',
        mask: 'lines',
        // Restores the original markup on revert, and labels the element so
        // assistive tech reads the sentence rather than the word soup.
        aria: 'auto',
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.words, {
            yPercent: 110,
            opacity: 0,
            duration: DURATION,
            ease: EASE,
            stagger,
            scrollTrigger: {
              trigger: ref.current,
              start: 'top 85%',
              once: true,
            },
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
