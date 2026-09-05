import { PRODUCTS } from '../lib/products'
import { revealDelay } from '../lib/reveal'
import ProductCard from './ProductCard'
import RevealText from './RevealText'

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
