import Nav from './components/Nav'
import Hero from './components/Hero'
import WhatWeBuild from './components/WhatWeBuild'
import Products from './components/Products'
import OpenSource from './components/OpenSource'
import BuildWithRecoil from './components/BuildWithRecoil'
import Approach from './components/Approach'
import About from './components/About'
import Writing from './components/Writing'
import Newsletter from './components/Newsletter'
import Contact from './components/Contact'
import Footer from './components/Footer'
import SmoothScroll from './components/SmoothScroll'
import { useScrollReveal } from './lib/reveal'

export default function App() {
  useScrollReveal()

  return (
    <>
      {/* First, and a component rather than a hook, so that the smoother is
          created before any scroll-driven child and killed after — see the
          note in SmoothScroll.tsx. */}
      <SmoothScroll />
      {/* Outside the smooth wrapper on purpose: ScrollSmoother transforms
          #smooth-content, and a transformed ancestor would make the nav's
          `position: fixed` resolve against that box instead of the viewport,
          so the bar would scroll away with the page. */}
      <Nav />
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <div className="aurora" aria-hidden="true" />
          <main>
            <Hero />
            <WhatWeBuild />
            <Products />
            <OpenSource />
            <BuildWithRecoil />
            <Approach />
            <About />
            <Writing />
            <Newsletter />
            <Contact />
          </main>
          <Footer />
        </div>
      </div>
    </>
  )
}
