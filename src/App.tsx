import Nav from './components/Nav'
import Hero from './components/Hero'
import WhatWeBuild from './components/WhatWeBuild'
import Products from './components/Products'
import OpenSource from './components/OpenSource'
import Approach from './components/Approach'
import About from './components/About'
import Contact from './components/Contact'
import Footer from './components/Footer'
import { useScrollReveal } from './lib/reveal'

export default function App() {
  useScrollReveal()

  return (
    <>
      <div className="aurora" aria-hidden="true" />
      <Nav />
      <main>
        <Hero />
        <WhatWeBuild />
        <Products />
        <OpenSource />
        <Approach />
        <About />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
