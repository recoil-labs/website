import { revealDelay } from '../lib/reveal'

const FACTS = ['Founded in 2026', 'Based in Nigeria', 'Building for the world']

export default function About() {
  return (
    <section id="about" className="container about">
      <div className="about-split">
        <div data-reveal>
          <span className="eyebrow">About</span>
          <h2 className="section-title">
            A technology lab building products and solving hard problems
          </h2>
        </div>
        <div className="prose about-prose" data-reveal style={revealDelay(120)}>
          <p>
            Recoil Labs is an independent technology lab exploring new ways for
            artificial intelligence and decentralized infrastructure to work
            together.
          </p>
          <p>
            We are building products for a world where software can understand
            intent, coordinate across complex systems, and help people turn
            ideas into action — and we take that same engineering into a small
            number of partnerships each year.
          </p>
          <div className="about-facts">
            {FACTS.map((fact) => (
              <span key={fact}>{fact}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
