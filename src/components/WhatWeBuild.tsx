import { revealDelay } from '../lib/reveal'
import RevealText from './RevealText'

/** The domains the lab works across, in products and partnerships alike. */
const CAPABILITIES = [
  'AI',
  'Blockchain',
  'Web2',
  'Web3',
  'Decentralized infrastructure',
]

const PILLARS = [
  {
    title: 'Artificial Intelligence',
    body: 'Intelligent systems that understand context, automate complex workflows, and help people make better decisions.',
  },
  {
    title: 'Decentralized Infrastructure',
    body: 'Open and interoperable systems that allow applications, assets, and organizations to operate across networks.',
  },
  {
    title: 'Intelligent Execution',
    body: 'Software that turns high-level intentions into coordinated actions across complex digital environments.',
  },
]

export default function WhatWeBuild() {
  return (
    <section className="container build">
      <span className="eyebrow" data-reveal>
        What we build
      </span>
      <div className="build-split">
        <RevealText as="h2" className="section-title">
          We build intelligent products and the technology behind them
        </RevealText>
        <div className="prose" data-reveal>
          <p>
            The internet is becoming increasingly distributed, intelligent, and
            autonomous. But the infrastructure connecting people, organizations,
            and digital systems remains fragmented and difficult to use.
          </p>
          <p>Recoil Labs builds products that simplify that complexity.</p>
          <p>
            We combine AI, decentralized networks, intelligent routing, and
            automation to create systems that help people and organizations move
            from intention to action — in our own products, and in the ones we
            build alongside others.
          </p>
        </div>
      </div>

      <div className="pillars">
        {PILLARS.map((pillar, i) => (
          // The cell stays opaque (it masks the divider fill); its contents
          // are what reveal.
          <div className="pillar" key={pillar.title}>
            <div className="pillar-body" data-reveal style={revealDelay(i * 110)}>
              <h3>{pillar.title}</h3>
              <p>{pillar.body}</p>
            </div>
          </div>
        ))}
      </div>

      <ul className="capabilities" data-reveal>
        {CAPABILITIES.map((capability) => (
          <li className="tag tag-outline" key={capability}>
            {capability}
          </li>
        ))}
      </ul>
    </section>
  )
}
