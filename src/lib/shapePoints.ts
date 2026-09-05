/**
 * Turn a glyph or an SVG path into a point cloud the particle system can
 * morph into.
 *
 * The shape is rasterised to an offscreen canvas, then opaque pixels are
 * collected on a stride so the sample count lands near the target. Sampling
 * pixels rather than tracing outlines means the interior fills too — an
 * outline-only cloud reads as a wireframe, not a letterform.
 *
 * Coordinates come back centred on the origin in the range roughly
 * [-1, 1] on the shorter axis, matching the particle field's units.
 */

export interface ShapeSampleOptions {
  /** Roughly how many points to return. Actual count lands within ~10%. */
  count: number
  /** Offscreen raster resolution. Higher resolves finer detail, costs more. */
  resolution?: number
  /** Font stack used when rasterising text. */
  fontFamily?: string
  fontWeight?: number | string
}

/** Fisher-Yates. Sampling on a raster stride walks the shape in scanline
 *  order, so without a shuffle the particles arrive top-to-bottom in a
 *  visible wipe rather than converging as a whole. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function samplePixels(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  count: number,
): Array<[number, number]> {
  const { data } = ctx.getImageData(0, 0, w, h)

  // First pass: how much of the canvas is actually covered? The stride has
  // to be derived from the filled area, not the whole canvas, or a sparse
  // glyph returns far too few points.
  let filled = 0
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 128) filled++
  }
  if (filled === 0) return []

  const stride = Math.max(1, Math.floor(filled / count))
  const pts: Array<[number, number]> = []
  const scale = 2 / Math.min(w, h)

  let seen = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] <= 128) continue
      if (seen++ % stride !== 0) continue
      // Centre on the origin, and flip y — canvas grows downward, the
      // particle field grows upward.
      pts.push([(x - w / 2) * scale, -(y - h / 2) * scale])
    }
  }

  return shuffle(pts)
}

/** Rasterise a string and sample it. */
export function textToPoints(
  text: string,
  {
    count,
    resolution = 512,
    fontFamily = 'Inter, system-ui, sans-serif',
    fontWeight = 600,
  }: ShapeSampleOptions,
): Array<[number, number]> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []

  // Measure at a reference size, then scale the font so the string fills
  // the raster regardless of how many characters it has.
  const probe = 100
  ctx.font = `${fontWeight} ${probe}px ${fontFamily}`
  const metrics = ctx.measureText(text)
  const textW = metrics.width
  const textH =
    (metrics.actualBoundingBoxAscent || probe * 0.7) +
    (metrics.actualBoundingBoxDescent || probe * 0.2)
  if (textW === 0 || textH === 0) return []

  // 0.9 leaves a margin so glyph edges are not clipped by the raster.
  const fontSize = probe * Math.min((resolution * 0.9) / textW, (resolution * 0.9) / textH)

  canvas.width = resolution
  canvas.height = resolution
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText(text, resolution / 2, resolution / 2)

  return samplePixels(ctx, resolution, resolution, count)
}

/** Rasterise an SVG path's `d` attribute and sample it. */
export function pathToPoints(
  d: string,
  viewBox: number,
  { count, resolution = 512 }: ShapeSampleOptions,
): Array<[number, number]> {
  const canvas = document.createElement('canvas')
  canvas.width = resolution
  canvas.height = resolution
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx || typeof Path2D === 'undefined') return []

  const s = (resolution * 0.9) / viewBox
  ctx.translate(resolution * 0.05, resolution * 0.05)
  ctx.scale(s, s)
  ctx.fillStyle = '#fff'
  ctx.fill(new Path2D(d))

  return samplePixels(ctx, resolution, resolution, count)
}
