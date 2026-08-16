import MeshCanvas from './MeshCanvas'

export default function Hero() {
  return (
    <section className="hero">
      <MeshCanvas className="hero-mesh" />
      <div className="container hero-inner">
        <span className="eyebrow">Recoil Labs</span>
        <h1 className="hero-title">
          Building intelligent systems for an open digital world.
        </h1>
        <p className="hero-lede">
          Recoil Labs is a technology company building applications at the
          intersection of artificial intelligence, blockchain, and decentralized
          infrastructure.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#products">
            Explore our products
          </a>
          <a className="btn btn-ghost" href="#contact">
            Get in touch
          </a>
        </div>
      </div>
    </section>
  )
}
