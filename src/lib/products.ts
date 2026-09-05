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

/**
 * The single source of truth for what Recoil Labs ships: the cards render it,
 * and the footer's product column reads the same list so the two cannot drift.
 * Lives here rather than in Products.tsx so that file only exports components.
 */
export const PRODUCTS: Product[] = [
  {
    name: 'RecoilPay',
    status: { label: 'Live product', tone: 'accent' },
    tagline: 'The original app for multichain payments.',
    body: 'The first release, still live. Cross-chain transfers and swaps in one place.',
    tags: ['Cross-chain', 'Payments', 'DeFi'],
    href: 'https://recoilpay.com/',
  },
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
    name: 'Redline',
    status: { label: 'In development', tone: 'neutral' },
    tagline: 'Agents propose, you dispose.',
    body: 'An AI agent proposes clause-level redlines. You accept or reject each one.',
    tags: ['Contracts', 'Legal', 'AI'],
    href: 'https://redline-orpin-nine.vercel.app/',
  },
]

/** Absolute URLs leave the site; in-page anchors do not. */
export const isExternal = (href: string) => /^https?:\/\//.test(href)
