import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '../lib/motion'

interface TypewriterProps {
  text: string
  /** Average ms per character. Each keystroke jitters around this. */
  speed?: number
  /** Ms to wait after mount before the first character lands. */
  startDelay?: number
  className?: string
}

/** How far each keystroke's delay strays from `speed`, as a fraction of it.
    Perfectly even typing reads as a progress bar rather than as typing. */
const JITTER = 0.55
/** Characters that earn an extra beat, as a multiple of `speed`. */
const PAUSE_AFTER: Record<string, number> = { ',': 5, '.': 9, '—': 5, ':': 5 }

/**
 * Types `text` out one character at a time behind a caret.
 *
 * The full string is always in the DOM at `opacity: 0`, stacked under the
 * typed portion in the same grid cell. That ghost is what sizes the box, so
 * a headline that wraps to three lines reserves all three from the first
 * frame — nothing below it moves while the typing runs. It also carries the
 * accessible text: the ghost is what a screen reader reads (opacity, unlike
 * `visibility: hidden`, keeps it in the accessibility tree), and the
 * animating copy is hidden from assistive tech so the headline is announced
 * once, whole, instead of once per character.
 */
export default function Typewriter({
  text,
  speed = 38,
  startDelay = 260,
  className,
}: TypewriterProps) {
  // Read once, at initialization rather than in the effect: under reduced
  // motion the finished line has to be the very first render, not a second
  // one the effect schedules. There is no animation to keep in sync with a
  // preference change mid-flight, so nothing subscribes to it.
  const [reduced] = useState(prefersReducedMotion)
  const [count, setCount] = useState(() => (reduced ? text.length : 0))
  const [done, setDone] = useState(reduced)

  useEffect(() => {
    if (reduced) return

    let timer: number
    let i = 0

    const step = () => {
      i += 1
      setCount(i)
      if (i >= text.length) {
        setDone(true)
        return
      }
      const pause = PAUSE_AFTER[text[i - 1]] ?? 1
      const jitter = 1 + (Math.random() - 0.5) * JITTER
      timer = window.setTimeout(step, speed * pause * jitter)
    }

    timer = window.setTimeout(step, startDelay)
    return () => window.clearTimeout(timer)
  }, [text, speed, startDelay, reduced])

  return (
    <span className={`typewriter${className ? ` ${className}` : ''}`}>
      <span className="typewriter-ghost">{text}</span>
      <span className="typewriter-live" aria-hidden="true">
        {text.slice(0, count)}
        <span className={`typewriter-caret${done ? ' is-blinking' : ''}`} />
      </span>
    </span>
  )
}
