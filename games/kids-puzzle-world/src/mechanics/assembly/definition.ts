import { PuzzleDefinition, HintTier } from '@/runtime/types'
import { AssemblyState, movePiece, rotatePiece, checkSilhouetteFit, getSilhouetteAnchor, isPieceCorrectlyPlaced } from './state'
import { generateAssemblyPuzzle } from './generator'
import { levelNumberFromSeed } from '@/shared/rng'

export interface AssemblyAction {
  type: 'movePiece' | 'rotatePiece' | 'reset'
  pieceId?: string
  newX?: number
  newY?: number
}

export type AssemblyHintState = { hint: string; highlightPieceIds?: string[] }

export const assemblyPuzzleDefinition: PuzzleDefinition<AssemblyState, AssemblyAction, AssemblyHintState> = {
  metadata: {
    id: 'assembly-001',
    mechanicId: 'assembly',
    title: 'Shape Workshop Puzzle',
    regionId: 'shape-workshop',
    difficulty: { level: 1, params: { gridSize: 8, numPieces: 4 } },
    seed: 42,
  },

  createInitialState: (seed = 1_000_000) => {
    const levelNumber = levelNumberFromSeed(seed)
    return generateAssemblyPuzzle(seed, {
      gridSize: Math.min(8 + Math.floor((levelNumber - 1) / 2), 12),
      numPieces: Math.min(3 + levelNumber, 8),
    })
  },

  reducer: (state, action) => {
    if (action.type === 'movePiece' && action.pieceId && action.newX !== undefined && action.newY !== undefined) {
      const newState = movePiece(state, action.pieceId, action.newX, action.newY)
      return {
        ...newState,
        isComplete: checkSilhouetteFit(newState.pieces, newState.targetSilhouette),
      }
    }

    if (action.type === 'rotatePiece' && action.pieceId) {
      const newState = rotatePiece(state, action.pieceId)
      return {
        ...newState,
        isComplete: checkSilhouetteFit(newState.pieces, newState.targetSilhouette),
      }
    }

    if (action.type === 'reset') {
      return assemblyPuzzleDefinition.createInitialState(state.seed)
    }

    return state
  },

  isValidAction: (state, action) => {
    if (action.type === 'movePiece' && action.pieceId) {
      return state.pieces.some((p) => p.id === action.pieceId)
    }
    if (action.type === 'rotatePiece' && action.pieceId) {
      return state.pieces.some((p) => p.id === action.pieceId)
    }
    return true
  },

  checkWin: (state) => state.isComplete,

  getHintState: (state, tier: HintTier): AssemblyHintState => {
    const anchor = getSilhouetteAnchor(state.targetSilhouette)
    const misplaced = state.pieces.filter((p) => !isPieceCorrectlyPlaced(p, anchor))

    if (misplaced.length === 0) {
      return { hint: `All pieces look right — check for overlaps.` }
    }

    if (tier >= 3) {
      const piece = misplaced[0]
      const rotationsNeeded = ((360 - (piece.rotation % 360)) % 360) / 90
      return {
        hint: `Move the highlighted piece to grid position (${anchor.x}, ${anchor.y}) and rotate it back to 0° (${rotationsNeeded} more tap${rotationsNeeded === 1 ? '' : 's'}).`,
        highlightPieceIds: [piece.id],
      }
    }

    if (tier >= 2) {
      return {
        hint: `Every piece belongs in the same target square, each at its original rotation — stack them without overlapping.`,
        highlightPieceIds: misplaced.map((p) => p.id),
      }
    }

    if (tier >= 1) {
      return {
        hint: `Drag pieces to move them, tap to rotate.`,
      }
    }

    return { hint: `Assemble the pieces into the target silhouette.` }
  },

  serialize: (state) => ({
    schemaVersion: 1,
    mechanicId: 'assembly',
    payload: state,
  }),

  deserialize: (data) => data.payload as AssemblyState,

  reset: (state) => {
    return assemblyPuzzleDefinition.createInitialState(state.seed)
  },
}
