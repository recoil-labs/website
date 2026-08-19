import type { CSSProperties } from 'react'
import { revealDelay } from '../lib/reveal'
import RevealText from './RevealText'

interface Post {
  kicker: string
  title: string
  excerpt: string
  /** ISO date, used for both <time datetime> and the printed label. */
  date: string
  readingTime: string
  href: string
  /**
   * Cover image. Omit it and the card falls back to a generated gradient —
   * which is what every entry below currently does, since the posts are
   * placeholders and the project ships no image assets.
   *
   * `alt` should usually be `''`: the whole card is one link, and the title
   * sits directly beneath, so describing the cover as well makes a screen
   * reader read the link name twice. Give it real text only when the image
   * carries information the title does not.
   */
  image?: { src: string; alt: string }
}

/* Degrees of hue shift per card, so consecutive covers read as a set rather
   than as three copies. Deliberately small: the palette is purple, and much
   past ~40° of rotation the gradient lands in red and stops looking like it
   belongs to this site. */
const COVER_HUE_STEP = 14

/**
 * ⚠️ Placeholder entries. These are structural examples, not real articles —
 * replace them with actual posts (and real hrefs) before shipping. A proper
 * blog wants routing or a CMS behind it; this section only lists what exists.
 */
const POSTS: Post[] = [
  {
    kicker: 'Engineering',
    title: 'Why we express transactions as intents',
    excerpt:
      'The gap between what someone wants to do on-chain and the steps required to do it keeps widening. Here is how RecoilPay closes it.',
    date: '2026-07-28',
    readingTime: '6 min read',
    href: '#',
  },
  {
    kicker: 'CivicOS',
    title: 'Building civic software in the open',
    excerpt:
      'What we learned opening up the codebase behind CivicOS, and why public infrastructure should be auditable by the public it serves.',
    date: '2026-07-09',
    readingTime: '4 min read',
    href: '#',
  },
  {
    kicker: 'Notes',
    title: 'Intent, intelligence, execution',
    excerpt:
      'A short piece on the through-line connecting everything we build, and why absorbing complexity is a design problem before it is a technical one.',
    date: '2026-06-22',
    readingTime: '3 min read',
    href: '#',
  },
]

const dateFormat = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export default function Writing() {
  return (
    <section id="writing" className="container writing">
      <span className="eyebrow eyebrow-center" data-reveal>
        Writing
      </span>
      <RevealText as="h2" className="section-title">
        Notes from the lab
      </RevealText>

      <div className="post-grid">
        {POSTS.map((post, i) => (
          <a
            className="card elev-sm post"
            key={post.title}
            href={post.href}
            data-reveal
            style={
              {
                ...revealDelay(160 + i * 110),
                '--cover-shift': `${i * COVER_HUE_STEP}deg`,
              } as CSSProperties
            }
          >
            <div className="post-cover">
              {post.image ? (
                <img
                  src={post.image.src}
                  alt={post.image.alt}
                  /* Dimensions are the intrinsic ratio, not the rendered
                     size — with the CSS aspect-ratio they let the browser
                     hold the box before the file arrives, so nothing below
                     the card jumps when it does. */
                  width={640}
                  height={360}
                  loading="lazy"
                  decoding="async"
                />
              ) : null}
            </div>
            <div className="post-content">
              <span className="card-kicker">{post.kicker}</span>
              <h3 className="card-title">{post.title}</h3>
              <p className="card-body">{post.excerpt}</p>
              <div className="card-meta">
                <time dateTime={post.date}>
                  {dateFormat.format(new Date(post.date))}
                </time>
                <span aria-hidden="true">·</span>
                <span>{post.readingTime}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
