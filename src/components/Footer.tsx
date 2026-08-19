import SocialLinks from './SocialLinks'

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
        <SocialLinks />
      </div>

      <div className="footer-col">
        <span className="footer-col-title">Products</span>
        <a href="#products">RecoilPay</a>
        <a href="https://civicos.ng/" target="_blank" rel="noreferrer noopener">
          CivicOS
        </a>
      </div>

      <div className="footer-col">
        <span className="footer-col-title">Work with us</span>
        <a href="#build">Build with Recoil</a>
        <a href="#build">Consulting</a>
      </div>

      <div className="footer-col">
        <span className="footer-col-title">Company</span>
        <a href="#about">About</a>
        <a href="#writing">Writing</a>
        <a href="#open-source">Open source</a>
        <a href="#contact">Contact</a>
      </div>

      <div className="footer-legal">© {new Date().getFullYear()} Recoil Labs</div>
    </footer>
  )
}
