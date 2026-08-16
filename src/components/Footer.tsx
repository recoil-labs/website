export default function Footer() {
  return (
    <footer className="container site-footer" data-reveal>
      <div>
        <span className="footer-brand">
          <span aria-hidden="true">◈</span>RECOIL LABS
        </span>
        <p className="footer-tagline">
          Building intelligent systems for an open digital world.
        </p>
      </div>

      <div className="footer-col">
        <span className="footer-col-title">Products</span>
        <a href="#products">RecoilPay</a>
        <a href="#products">CivicOS</a>
      </div>

      <div className="footer-col">
        <span className="footer-col-title">Company</span>
        <a href="#about">About</a>
        <a href="#open-source">Open source</a>
        <a href="#contact">Contact</a>
      </div>

      <div className="footer-legal">© {new Date().getFullYear()} Recoil Labs</div>
    </footer>
  )
}
