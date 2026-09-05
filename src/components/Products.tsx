import { revealDelay } from '../lib/reveal'
import ProductCard from './ProductCard'
import type { Product } from './ProductCard'
import RevealText from './RevealText'

const PRODUCTS: Product[] = [
  {
    name: 'RecoilPay V2',
    status: { label: 'In development', tone: 'neutral' },
    tagline: 'AI-powered Intent-based execution for the multichain economy.',
    body: 'Express what you want on-chain. RecoilPay routes the bridges and swaps.',
    tags: ['Intent-based', 'Cross-chain', 'AI'],
    href: 'https://v2.recoilpay.com/',
    featured: true,
  },
  {
    name: 'CivicOS',
    status: { label: 'In development', tone: 'neutral' },
    tagline: 'AI-powered infrastructure for communities and institutions.',
    body: 'Helps communities coordinate, understand local needs, and act on them.',
    tags: ['Open source', 'Civic tech', 'AI'],
    href: 'https://civicos.ng/',
  },
  {
    name: 'RecoilPay',
    status: { label: 'Live product', tone: 'accent' },
    tagline: 'The original app for multichain payments.',
    body: 'The first release, still live. Cross-chain transfers and swaps in one place.',
    tags: ['Cross-chain', 'Payments', 'DeFi'],
    href: 'https://recoilpay.com/',
  },
  {
    name: 'Redline',
    status: { label: 'In development', tone: 'neutral' },
    tagline: 'Agents propose, you dispose.',
    body: 'An AI agent proposes clause-level redlines. You accept or reject each one.',
    tags: ['Contracts', 'Legal', 'AI'],
    href: 'https://redline-orpin-nine.vercel.app/',
  },
]

export default function Products() {
  return (
    <section id="products" className="container products">
      <span className="eyebrow eyebrow-center" data-reveal>
        Our products
      </span>
      <RevealText as="h2" className="section-title">
        Four products, one idea
      </RevealText>

      <div className="product-grid">
        {PRODUCTS.map((product, i) => (
          <ProductCard
            key={product.name}
            product={product}
            style={revealDelay(160 + i * 120)}
          />
        ))}
      </div>
    </section>
  )
}
