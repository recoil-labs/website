export const CONTACT_EMAIL = 'hello@recoillabs.com'

export default function Contact() {
  return (
    <section id="contact" className="container contact">
      <h2>Let’s build what’s next.</h2>
      <p>
        We’re interested in working with developers, organizations, researchers,
        communities, and people building ambitious things.
      </p>
      <a className="btn btn-primary" href={`mailto:${CONTACT_EMAIL}`}>
        Contact Recoil Labs →
      </a>
    </section>
  )
}
