import { createSeededRNG } from '@/shared/rng'
import { AssemblyState, Piece } from './state'

interface GeneratorParams {
  gridSize: number
  numPieces: number
}

function createRectangleSilhouette(width: number, height: number): Array<{ x: number; y: number }> {
  const cells = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells.push({ x, y })
    }
  }
  return cells
}

function partitionSilhouette(silhouette: Array<{ x: number; y: number }>, numPieces: number, rng: any): Array<Array<{ x: number; y: number }>> {
  const pieces: Array<Array<{ x: number; y: number }>> = []
  const cellsPerPiece = Math.ceil(silhouette.length / numPieces)

  const shuffled = rng.shuffle([...silhouette])
  for (let i = 0; i < numPieces; i++) {
    const start = i * cellsPerPiece
    const end = Math.min(start + cellsPerPiece, shuffled.length)
    if (start < shuffled.length) {
      pieces.push(shuffled.slice(start, end))
    }
  }

  return pieces.filter((p) => p.length > 0)
}

export function generateAssemblyPuzzle(seed: number, params: Partial<GeneratorParams> = {}): AssemblyState {
  const { gridSize = 8, numPieces = 4 } = params
  const rng = createSeededRNG(seed)

  // Create target silhouette
  const silhouetteWidth = Math.min(4, gridSize)
  const silhouetteHeight = Math.min(4, gridSize)
  const targetSilhouette = createRectangleSilhouette(silhouetteWidth, silhouetteHeight)

  // Partition into pieces
  const partitions = partitionSilhouette(targetSilhouette, numPieces, rng)

  const centerX = Math.floor(silhouetteWidth / 2)
  const centerY = Math.floor(silhouetteHeight / 2)
  const maxCoord = Math.max(gridSize - 1, 0)

  // Scramble each piece to a random spot clear of the solved target zone, so
  // the puzzle never starts partially (or fully) solved by construction.
  // (The previous version called nextInt(5, gridSize - 5), which for the
  // default gridSize=8 is nextInt(5, 3) — an inverted min>max range that
  // produced a nearly-fixed, barely-scrambled placement for every piece.)
  const pieces: Piece[] = partitions.map((partition, i) => {
    const cells = partition.map(({ x, y }) => ({ x: x - centerX, y: y - centerY }))

    let x = 0
    let y = 0
    for (let attempt = 0; attempt < 30; attempt++) {
      x = rng.nextInt(0, maxCoord)
      y = rng.nextInt(0, maxCoord)
      const overlapsTarget = cells.some(({ x: cx, y: cy }) => {
        const ax = x + cx
        const ay = y + cy
        return ax >= 0 && ax < silhouetteWidth && ay >= 0 && ay < silhouetteHeight
      })
      if (!overlapsTarget) break
    }

    return {
      id: `piece-${i}`,
      x,
      y,
      rotation: (rng.nextInt(0, 3) * 90) as 0 | 90 | 180 | 270,
      cells,
    }
  })

  return {
    pieces,
    targetSilhouette,
    gridSize,
    isComplete: false,
    seed,
  }
}
