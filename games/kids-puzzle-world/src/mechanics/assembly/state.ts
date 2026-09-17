export interface Piece {
  id: string
  x: number
  y: number
  rotation: number // 0, 90, 180, 270
  cells: Array<{ x: number; y: number }> // Relative to piece origin
}

export interface AssemblyState {
  pieces: Piece[]
  targetSilhouette: Array<{ x: number; y: number }>
  gridSize: number
  isComplete: boolean
  seed?: number
}

export function getPieceOccupiedCells(piece: Piece): Array<{ x: number; y: number }> {
  const rotationCos = [1, 0, -1, 0][(piece.rotation / 90) % 4]
  const rotationSin = [0, 1, 0, -1][(piece.rotation / 90) % 4]

  return piece.cells.map(({ x, y }) => {
    const rotX = x * rotationCos - y * rotationSin
    const rotY = x * rotationSin + y * rotationCos
    return {
      x: piece.x + Math.round(rotX),
      y: piece.y + Math.round(rotY),
    }
  })
}

export function checkSilhouetteFit(pieces: Piece[], targetSilhouette: Array<{ x: number; y: number }>): boolean {
  const occupiedCells = new Set<string>()

  pieces.forEach((piece) => {
    getPieceOccupiedCells(piece).forEach(({ x, y }) => {
      occupiedCells.add(`${x},${y}`)
    })
  })

  const targetCells = new Set<string>()
  targetSilhouette.forEach(({ x, y }) => {
    targetCells.add(`${x},${y}`)
  })

  // Check if occupied cells match target
  if (occupiedCells.size !== targetCells.size) return false

  for (const cell of occupiedCells) {
    if (!targetCells.has(cell)) return false
  }

  return true
}

export function movePiece(state: AssemblyState, pieceId: string, newX: number, newY: number): AssemblyState {
  return {
    ...state,
    pieces: state.pieces.map((p) => (p.id === pieceId ? { ...p, x: newX, y: newY } : p)),
  }
}

export function rotatePiece(state: AssemblyState, pieceId: string): AssemblyState {
  return {
    ...state,
    pieces: state.pieces.map((p) => (p.id === pieceId ? { ...p, rotation: (p.rotation + 90) % 360 } : p)),
  }
}

// Every piece's cells were cut from the same silhouette relative to the same
// center, so every piece's correct final anchor is this one point at
// rotation 0 — pieces differ only in which cells they carry, not in anchor.
export function getSilhouetteAnchor(targetSilhouette: Array<{ x: number; y: number }>): { x: number; y: number } {
  const maxX = Math.max(0, ...targetSilhouette.map((c) => c.x))
  const maxY = Math.max(0, ...targetSilhouette.map((c) => c.y))
  return { x: Math.floor((maxX + 1) / 2), y: Math.floor((maxY + 1) / 2) }
}

export function isPieceCorrectlyPlaced(piece: Piece, anchor: { x: number; y: number }): boolean {
  return piece.x === anchor.x && piece.y === anchor.y && piece.rotation % 360 === 0
}
