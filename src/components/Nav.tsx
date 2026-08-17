import { useEffect, useState } from 'react'

const LINKS = [
  { id: 'products', label: 'Products' },
  { id: 'build', label: 'Build with us' },
  { id: 'approach', label: 'Approach' },
  { id: 'about', label: 'About' },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState<string | null>(null)

  // Give the bar a ground once it leaves the top of the hero.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Mark the section being read. The margins collapse the viewport to a thin
  // band just above the middle, so exactly one section qualifies at a time.
  useEffect(() => {
    const targets = LINKS.map(({ id }) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    )
    if (!targets.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    for (const target of targets) observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return (
    <nav className={`nav site-nav${scrolled ? ' is-scrolled' : ''}`}>
      <span className="nav-brand">
        <span className="brand-mark" aria-hidden="true">
          ◈
        </span>
        Recoil Labs
      </span>
      {LINKS.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={active === id ? 'page' : undefined}
        >
          {label}
        </a>
      ))}
      <a className="btn btn-primary" href="#contact">
        Get in touch
      </a>
    </nav>
  )
}
