const FACTS = ['Founded in 2026', 'Based in Nigeria', 'Building for the world']

export default function About() {
  return (
    <section id="about" className="container about">
      <div className="about-split">
        <div>
          <span className="eyebrow">About</span>
          <h2 className="section-title">A small lab with ambitious ideas.</h2>
        </div>
        <div className="prose about-prose">
          <p>
            Recoil Labs is an independent technology company exploring new ways
            for artificial intelligence and decentralized infrastructure to work
            together.
          </p>
          <p>
            We are building products for a world where software can understand
            intent, coordinate across complex systems, and help people turn
            ideas into action.
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
