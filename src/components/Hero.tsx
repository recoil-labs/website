import MeshCanvas from './MeshCanvas'
import Typewriter from './Typewriter'

export default function Hero() {
  return (
    <section className="hero">
      <MeshCanvas className="hero-mesh" />
      <div className="container hero-inner">
        <span className="eyebrow eyebrow-center">Recoil Labs</span>
        <h1 className="hero-title">
          <Typewriter text="Building intelligent systems for an open digital world" />
        </h1>
        <p className="hero-lede">
          Recoil Labs is a technology and research lab working at the intersection of
          artificial intelligence, blockchain, and decentralized infrastructure
          building our own products, and building with the organizations who
          need that expertise.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#products">
            Explore our work
          </a>
          <a className="btn btn-ghost" href="#build">
            Build with us
          </a>
        </div>
      </div>
    </section>
  )
}
