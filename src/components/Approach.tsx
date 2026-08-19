import { revealDelay } from '../lib/reveal'
import RevealText from './RevealText'
import FlowScrub from './FlowScrub'

export default function Approach() {
  return (
    <section id="approach" className="container approach">
      <span className="eyebrow eyebrow-center" data-reveal>
        Our approach
      </span>
      <RevealText as="h2" className="section-title">
        Complex systems shouldn’t require complex experiences
      </RevealText>

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

      <FlowScrub />

      <p className="approach-note" data-reveal style={revealDelay(120)}>
        Recoil represents the release of energy into motion. At Recoil Labs, we
        turn ideas and intentions into action.
      </p>
    </section>
  )
}
