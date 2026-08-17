import { revealDelay } from '../lib/reveal'

export const CONTACT_EMAIL = 'hello@recoillabs.com'

export default function Contact() {
  return (
    <section id="contact" className="container contact">
      <h2 data-reveal>Let’s build what’s next</h2>
      <p data-reveal style={revealDelay(100)}>
        We’re interested in working with developers, organizations, researchers,
        communities, and people building ambitious things.
      </p>
      <a
        className="btn btn-primary"
        href={`mailto:${CONTACT_EMAIL}`}
        data-reveal
        style={revealDelay(200)}
      >
        Contact Recoil Labs
        <span className="btn-arrow" aria-hidden="true">
          →
        </span>
      </a>
    </section>
  )
}
