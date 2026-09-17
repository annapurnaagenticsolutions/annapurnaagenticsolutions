import { PuzzleDefinition, HintTier } from '@/runtime/types'
import { createSeededRNG } from '@/shared/rng'

export interface SeedState {
  target: number
  current: number
  moves: number
}

export type SeedAction = { type: 'increment' } | { type: 'reset' }

export const seedPuzzleDefinition: PuzzleDefinition<SeedState, SeedAction, { hint: string }> = {
  metadata: {
    id: 'seed-001',
    mechanicId: 'pattern',
    title: 'Seed Puzzle',
    regionId: 'test',
    difficulty: { level: 1, params: { target: 5 } },
    seed: 42,
  },

  createInitialState: (seed = 42) => {
    const rng = createSeededRNG(seed)
    return {
      target: rng.nextInt(3, 8),
      current: 0,
      moves: 0,
    }
  },

  reducer: (state, action) => {
    if (action.type === 'increment') {
      return {
        ...state,
        current: Math.min(state.current + 1, state.target + 2),
        moves: state.moves + 1,
      }
    }
    if (action.type === 'reset') {
      return {
        target: state.target,
        current: 0,
        moves: 0,
      }
    }
    return state
  },

  isValidAction: () => true,

  checkWin: (state) => state.current === state.target,

  getHintState: (state, tier: HintTier) => {
    if (tier >= 1) {
      if (state.current < state.target) {
        return { hint: 'Try incrementing more' }
      } else {
        return { hint: 'Too high, try resetting' }
      }
    }
    return { hint: 'Click increment to reach the target' }
  },

  serialize: (state) => ({
    schemaVersion: 1,
    mechanicId: 'pattern',
    payload: state,
  }),

  deserialize: (data) => data.payload as SeedState,

  reset: (state) => ({
    target: state.target,
    current: 0,
    moves: 0,
  }),
}
