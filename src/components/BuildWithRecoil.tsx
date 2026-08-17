import { revealDelay } from '../lib/reveal'
import { CONTACT_EMAIL } from './Contact'

interface Service {
  title: string
  items: string[]
}

/** The four build disciplines, shown as a grid. */
const SERVICES: Service[] = [
  {
    title: 'AI',
    items: [
      'AI agents',
      'LLM applications',
      'AI automation',
      'RAG systems',
      'AI-powered SaaS',
      'AI integrations',
    ],
  },
  {
    title: 'Blockchain & Web3',
    items: [
      'DeFi applications',
      'Smart contracts',
      'Wallet integrations',
      'Cross-chain applications',
      'Intent-based systems',
      'Tokenization',
      'Web3 infrastructure',
    ],
  },
  {
    title: 'Web2',
    items: [
      'SaaS applications',
      'APIs and backend systems',
      'Cloud infrastructure',
      'Mobile and web applications',
      'Developer platforms',
    ],
  },
  {
    title: 'Product Engineering',
    items: [
      'MVP development',
      'Technical architecture',
      'Product prototyping',
      'Developer experience',
      'API and SDK development',
      'Technical documentation',
    ],
  },
]

/** Consulting stands apart from the build disciplines — it precedes them. */
const CONSULTING = [
  'Technical strategy',
  'AI adoption strategy',
  'Blockchain feasibility assessments',
  'Architecture reviews',
  'Web3 strategy',
  'Product discovery',
  'Technical due diligence',
  'Developer experience consulting',
]

export default function BuildWithRecoil() {
  return (
    <section id="build" className="container build-with">
      <span className="eyebrow eyebrow-center" data-reveal>
        Build with Recoil
      </span>
      <h2 className="section-title" data-reveal style={revealDelay(80)}>
        Have a complex idea that needs serious engineering?
      </h2>
      <p className="build-with-lede" data-reveal style={revealDelay(140)}>
        Recoil Labs partners with startups, organizations, and businesses to
        design and build software across artificial intelligence, blockchain,
        Web2, and Web3.
      </p>

      <div className="service-grid">
        {SERVICES.map((service, i) => (
          <article
            className="card elev-sm service"
            key={service.title}
            data-reveal
            style={revealDelay(200 + i * 90)}
          >
            <h3>{service.title}</h3>
            <ul>
              {service.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <article className="card elev-md consulting" data-reveal>
        <div className="consulting-intro">
          <h3>Consulting</h3>
          <p>
            Need help figuring out what to build? We help organizations turn
            technical ideas into practical products — before a line of code is
            committed to.
          </p>
        </div>
        <ul className="consulting-list">
          {CONSULTING.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      <div className="build-with-close" data-reveal>
        <p>
          We keep this work selective. We take on the projects where the hard
          part is the point — where depth in AI, distributed systems, and
          product engineering changes what is actually possible to build.
        </p>
        <a
          className="btn btn-primary"
          href={`mailto:${CONTACT_EMAIL}?subject=Project%20enquiry`}
        >
          Tell us what you’re building
          <span className="btn-arrow" aria-hidden="true">
            →
          </span>
        </a>
      </div>
    </section>
  )
}
