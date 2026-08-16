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
      <span className="eyebrow">What we build</span>
      <div className="build-split">
        <h2 className="section-title">
          We build where intelligence meets infrastructure.
        </h2>
        <div className="prose">
          <p>
            The internet is becoming increasingly distributed, intelligent, and
            autonomous. But the infrastructure connecting people, organizations,
            and digital systems remains fragmented and difficult to use.
          </p>
          <p>Recoil Labs builds products that simplify that complexity.</p>
          <p>
            We combine AI, decentralized networks, intelligent routing, and
            automation to create systems that help people and organizations move
            from intention to action.
          </p>
        </div>
      </div>

      <div className="pillars">
        {PILLARS.map((pillar) => (
          <div className="pillar" key={pillar.title}>
            <h3>{pillar.title}</h3>
            <p>{pillar.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
