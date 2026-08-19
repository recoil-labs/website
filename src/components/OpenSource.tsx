import { revealDelay } from '../lib/reveal'
import RevealText from './RevealText'

export default function OpenSource() {
  return (
    <section id="open-source" className="container open-source">
      <span className="eyebrow eyebrow-center" data-reveal>
        Open source
      </span>
      <RevealText as="h2" className="section-title">
        Built in the open
      </RevealText>

      <div className="prose open-source-prose" data-reveal style={revealDelay(160)}>
        <p>
          CivicOS is an open source project. The systems communities use to
          coordinate, understand local needs, and hold institutions accountable
          shouldn’t be a black box.
        </p>
        <p>
          Its source is public so anyone can read it, audit what it actually
          does, contribute to it, or run it themselves.
        </p>
        <p className="open-source-principle">
          Software that asks for public trust should be open to public scrutiny.
        </p>
      </div>
    </section>
  )
}
