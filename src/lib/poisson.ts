/**
 * Bridson's Poisson-disc sampling.
 *
 * The particle field needs blue noise, not a grid and not `Math.random()`.
 * A grid reads as a lattice the moment the cursor ring passes over it, and
 * uniform random clumps — leaving visible voids next to dense knots. Poisson
 * discs give even coverage with no repeating structure, which is what makes
 * the field read as a continuous surface rather than as scattered dots.
 *
 * O(n) via a background grid: each candidate only tests the cells within one
 * `minDistance` of itself.
 */

export interface PoissonOptions {
  width: number
  height: number
  /** No two points end up closer together than this. */
  minDistance: number
  /** Candidates tried per active point before it is retired. Bridson uses 30. */
  tries?: number
  random?: () => number
}

export function poissonDisc({
  width,
  height,
  minDistance,
  tries = 30,
  random = Math.random,
}: PoissonOptions): Array<[number, number]> {
  // At most one sample per cell, so a cell diagonal must not exceed
  // minDistance — hence the /√2.
  const cellSize = minDistance / Math.SQRT2
  const cols = Math.ceil(width / cellSize)
  const rows = Math.ceil(height / cellSize)

  const grid = new Int32Array(cols * rows).fill(-1)
  const points: Array<[number, number]> = []
  const active: number[] = []

  const gridIndex = (x: number, y: number) =>
    Math.floor(y / cellSize) * cols + Math.floor(x / cellSize)

  const fits = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false

    const gx = Math.floor(x / cellSize)
    const gy = Math.floor(y / cellSize)
    // Two cells of slack: a disc of radius minDistance can reach that far
    // once the candidate sits at the far corner of its own cell.
    const x0 = Math.max(gx - 2, 0)
    const x1 = Math.min(gx + 2, cols - 1)
    const y0 = Math.max(gy - 2, 0)
    const y1 = Math.min(gy + 2, rows - 1)

    for (let yy = y0; yy <= y1; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        const idx = grid[yy * cols + xx]
        if (idx === -1) continue
        const p = points[idx]
        const dx = p[0] - x
        const dy = p[1] - y
        if (dx * dx + dy * dy < minDistance * minDistance) return false
      }
    }
    return true
  }

  const push = (x: number, y: number) => {
    const idx = points.length
    points.push([x, y])
    grid[gridIndex(x, y)] = idx
    active.push(idx)
  }

  push(random() * width, random() * height)

  while (active.length > 0) {
    const a = Math.floor(random() * active.length)
    const [px, py] = points[active[a]]
    let placed = false

    for (let i = 0; i < tries; i++) {
      const angle = random() * Math.PI * 2
      // Uniform over the annulus [r, 2r] — sampling the radius linearly
      // would bias candidates toward the inner edge.
      const radius = minDistance * Math.sqrt(random() * 3 + 1)
      const x = px + Math.cos(angle) * radius
      const y = py + Math.sin(angle) * radius

      if (fits(x, y)) {
        push(x, y)
        placed = true
        break
      }
    }

    if (!placed) {
      // Retire by swapping with the tail — splice would be O(n).
      active[a] = active[active.length - 1]
      active.pop()
    }
  }

  return points
}
