import { useScopedCursor } from './CustomCursor'
import MorphingParticles from './MorphingParticles'

export interface Product {
  name: string
  /** Rendered as the status pill beside the name. Omit to show none. */
  status?: { label: string; tone: 'accent' | 'neutral' }
  tagline: string
  body: string
  tags: string[]
  /** In-page anchor, or an absolute URL for a product that has shipped. */
  href: string
  /** The flagship gets the accent wash and the solid button. */
  featured?: boolean
}

/** Absolute URLs leave the site; in-page anchors do not. */
const isExternal = (href: string) => /^https?:\/\//.test(href)

interface ProductCardProps {
  product: Product
  style?: React.CSSProperties
}

/**
 * Split out of Products so each card owns the hooks its interactions need —
 * a scoped cursor and a particle layer per card cannot come from a `.map()`
 * in the parent, since hooks cannot be called in a loop.
 */
export default function ProductCard({ product, style }: ProductCardProps) {
  const { wrapRef, dotRef } = useScopedCursor<HTMLElement, HTMLDivElement>()

  return (
    <article
      ref={wrapRef}
      className={`card elev-md product product-aura${product.featured ? ' product-featured' : ''}`}
      data-reveal
      style={style}
    >
      {/* Behind the content: scattered at rest, assembles into the product's
          monogram while the pointer is over the card.

          The initial rather than the full name deliberately. The full word
          rasterises to a thin horizontal band that lands right behind the
          body copy and reads as neither — a single glyph fills the card and
          works as a watermark the text can sit on top of. */}
      <MorphingParticles
        text={product.name.charAt(0)}
        hoverTargetRef={wrapRef}
        className="product-particles"
      />

      <div className="product-content">
        <div className="product-head">
          <h3>{product.name}</h3>
          {product.status && (
            <span className={`tag tag-${product.status.tone}`}>{product.status.label}</span>
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
          // Derived from the href rather than carried as its own field, so
          // there is no second flag to fall out of sync when a product
          // graduates from an anchor to a real URL.
          {...(isExternal(product.href)
            ? { target: '_blank', rel: 'noreferrer noopener' }
            : {})}
        >
          Explore {product.name}
          <span className="btn-arrow" aria-hidden="true">
            →
          </span>
        </a>
      </div>

      <div ref={dotRef} className="cursor-dot" aria-hidden="true">
        <span>View</span>
      </div>
    </article>
  )
}
