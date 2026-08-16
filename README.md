# Recoil Labs

Marketing site for Recoil Labs, built with React + TypeScript + Vite.

## Running it

```bash
npm install
npm run dev      # dev server
npm run build    # typecheck + production build to dist/
npm run preview  # serve the production build
npm run lint
```

## Structure

```
index.html                  document shell, meta tags, font preload
public/fonts/               Inter, self-hosted (variable woff2 subsets)
src/
  App.tsx                   section order
  styles/
    fonts.css               @font-face declarations
    nocturne.css            design system: tokens + component classes
    site.css                page layout, one block per section
  components/
    Nav, Hero, WhatWeBuild, Products, Approach, About, Contact, Footer
    MeshCanvas.tsx          the hero's animated node mesh
```

## Design system

`src/styles/nocturne.css` is the source of truth for the site's look — colors,
type, spacing, radii, elevation, and the shared `.btn` / `.card` / `.tag` /
`.nav` classes. Nothing outside that file should introduce a raw color or font
stack; retune the tokens there and the whole site follows.

The palette is a dark ground (`#161826`) with a blurple accent (`#9184d9`) and
three OKLCH tonal ramps generated on one shared lightness scale, so the same
step of any role matches the others in visual value.

`src/styles/site.css` holds page-level layout only, built from those tokens.

## Content

Section copy lives in the component that renders it. The repeated lists are
data arrays at the top of their file — `PILLARS` in `WhatWeBuild.tsx`,
`PRODUCTS` in `Products.tsx`, `FACTS` in `About.tsx` — so adding a product or
pillar is a data edit, not a markup edit. The contact address is exported as
`CONTACT_EMAIL` from `Contact.tsx`.

## Motion

Two ambient animations (`noct-mark` on the brand glyph, `noct-flow` on the
Intent → Intelligence → Execution rules) plus the hero's canvas mesh. All three
respect `prefers-reduced-motion`: the CSS animations stop, and `MeshCanvas`
paints a single static frame instead of running its rAF loop.

`recoil-labs-standalone.html` at the repo root is the original bundled design
this was built from, kept for reference.
