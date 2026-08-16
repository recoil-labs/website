export default function Nav() {
  return (
    <nav className="nav site-nav">
      <span className="nav-brand">
        <span className="brand-mark" aria-hidden="true">
          ◈
        </span>
        Recoil Labs
      </span>
      <a href="#products">Products</a>
      <a href="#approach">Approach</a>
      <a href="#about">About</a>
      <a className="btn btn-primary" href="#contact">
        Get in touch
      </a>
    </nav>
  )
}
