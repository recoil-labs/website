import { revealDelay } from '../lib/reveal'
import ProductCard from './ProductCard'
import type { Product } from './ProductCard'
import RevealText from './RevealText'

const PRODUCTS: Product[] = [
  {
    name: 'RecoilPay',
    status: { label: 'Live product', tone: 'accent' },
    tagline: 'AI-powered Intent-based execution for the multichain economy.',
    body: 'RecoilPay makes complex blockchain transactions simpler by allowing users to express what they want to accomplish rather than manually navigating chains, bridges, exchanges, liquidity sources, and transaction steps.',
    tags: ['Cross-chain', 'Intent-based', 'Payments', 'Solvers', 'AI', 'DeFi'],
    href: '#contact',
    featured: true,
  },
  {
    name: 'CivicOS',
    status: { label: 'In development', tone: 'neutral' },
    tagline: 'AI-powered infrastructure for communities and institutions.',
    body: 'CivicOS helps communities and organizations communicate, coordinate, understand local needs, and turn information into measurable action. It is developed as an open source project, in public.',
    tags: [
      'Open source',
      'AI',
      'Civic Technology',
      'Communities',
      'Accountability',
    ],
    href: 'https://civicos.ng/',
  },
]

export default function Products() {
  return (
    <section id="products" className="container products">
      <span className="eyebrow eyebrow-center" data-reveal>
        Our products
      </span>
      <RevealText as="h2" className="section-title">
        Two products, one idea
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
