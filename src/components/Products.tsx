import { revealDelay } from '../lib/reveal'

interface Product {
  name: string
  /** Rendered as the status pill beside the name. Omit to show none. */
  status?: { label: string; tone: 'accent' | 'neutral' }
  tagline: string
  body: string
  tags: string[]
  href: string
  /** The flagship gets the accent wash and the solid button. */
  featured?: boolean
}

const PRODUCTS: Product[] = [
  {
    name: 'RecoilPay',
    status: { label: 'Live product', tone: 'accent' },
    tagline: 'Intent-based execution for the multichain economy.',
    body: 'RecoilPay makes complex blockchain transactions simpler by allowing users to express what they want to accomplish rather than manually navigating chains, bridges, exchanges, liquidity sources, and transaction steps.',
    tags: ['Cross-chain', 'Intent-based', 'Payments', 'Solvers', 'DeFi'],
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
    href: '#contact',
  },
]

export default function Products() {
  return (
    <section id="products" className="container products">
      <span className="eyebrow eyebrow-center" data-reveal>
        Our products
      </span>
      <h2 className="section-title" data-reveal style={revealDelay(80)}>
        Two products, one idea.
      </h2>

      <div className="product-grid">
        {PRODUCTS.map((product, i) => (
          <article
            key={product.name}
            className={`card elev-md product${product.featured ? ' product-featured' : ''}`}
            data-reveal
            style={revealDelay(160 + i * 120)}
          >
            <div className="product-head">
              <h3>{product.name}</h3>
              {product.status && (
                <span className={`tag tag-${product.status.tone}`}>
                  {product.status.label}
                </span>
              )}
            </div>
            <p className="product-tagline">{product.tagline}</p>
            <p className="product-body">{product.body}</p>
            <div className="product-tags">
              {product.tags.map((tag) => (
                <span className="tag tag-outline" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <a
              className={`btn ${product.featured ? 'btn-primary' : 'btn-ghost'}`}
              href={product.href}
            >
              Explore {product.name}
              <span className="btn-arrow" aria-hidden="true">
                →
              </span>
            </a>
          </article>
        ))}
      </div>
    </section>
  )
}
