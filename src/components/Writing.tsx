import { revealDelay } from '../lib/reveal'

interface Post {
  kicker: string
  title: string
  excerpt: string
  /** ISO date, used for both <time datetime> and the printed label. */
  date: string
  readingTime: string
  href: string
}

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
      <h2 className="section-title" data-reveal style={revealDelay(80)}>
        Notes from the lab
      </h2>

      <div className="post-grid">
        {POSTS.map((post, i) => (
          <a
            className="card elev-sm post"
            key={post.title}
            href={post.href}
            data-reveal
            style={revealDelay(160 + i * 110)}
          >
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
          </a>
        ))}
      </div>
    </section>
  )
}
