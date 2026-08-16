import { revealDelay } from '../lib/reveal'

export default function Approach() {
  return (
    <section id="approach" className="container approach">
      <span className="eyebrow eyebrow-center" data-reveal>
        Our approach
      </span>
      <h2 className="section-title" data-reveal style={revealDelay(80)}>
        Complex systems shouldn’t require complex experiences.
      </h2>

      <div className="prose approach-prose" data-reveal style={revealDelay(160)}>
        <p>
          Blockchain networks, financial systems, communities, and institutions
          are becoming increasingly interconnected. Yet the complexity of these
          systems is often pushed onto the people who use them.
        </p>
        <p>We believe software should absorb that complexity.</p>
        <p>Our products are designed around a simple principle:</p>
        <p className="approach-principle">
          People express what they want. Intelligent systems figure out how to
          make it happen.
        </p>
      </div>

      <div className="flow" data-reveal>
        <span className="flow-step">Intent</span>
        <span className="flow-line" aria-hidden="true" />
        <span className="flow-step">Intelligence</span>
        <span className="flow-line flow-line-delayed" aria-hidden="true" />
        <span className="flow-step flow-step-end">Execution</span>
      </div>

      <p className="approach-note" data-reveal style={revealDelay(120)}>
        Recoil represents the release of energy into motion. At Recoil Labs, we
        turn ideas and intentions into action.
      </p>
    </section>
  )
}
