import { PuzzleDefinition, HintTier } from '@/runtime/types'
import { BalanceState, calculateTorque, snapToSlot } from './state'
import { generateBalancePuzzle } from './generator'
import { levelNumberFromSeed } from '@/shared/rng'

export interface BalanceAction {
  type: 'moveObject' | 'reset' | 'tick' | 'settle'
  objectId?: string
  x?: number
  y?: number
  dt?: number
}

export type BalanceHintState = { hint: string; highlightId?: string }

const PIVOT_X = 220
const PIVOT_Y = 300 + 30

export const balancePuzzleDefinition: PuzzleDefinition<BalanceState, BalanceAction, BalanceHintState> = {
  metadata: {
    id: 'balance-001',
    mechanicId: 'balance',
    title: 'Balance Bay Puzzle',
    regionId: 'balance-bay',
    difficulty: { level: 1, params: { numObjects: 3 } },
    seed: 42,
  },

  createInitialState: (seed = 1_000_000) => {
    const levelNumber = levelNumberFromSeed(seed)
    // More objects means more numbers that all have to sum to zero torque
    // at once — the real source of difficulty here, since it's a genuine
    // multi-variable arithmetic problem, not just "drag until it feels right".
    const numObjects = Math.min(3 + levelNumber, 8)
    // Wider mass spread makes the required notches less intuitive to eyeball.
    const maxMass = Math.min(4 + levelNumber, 10)
    // Bolted-down weights the player has to balance AROUND.
    const numLocked = Math.min(Math.floor(levelNumber / 2), Math.max(0, numObjects - 2))
    // One move per object placed, plus a shrinking allowance for rethinks.
    const movable = numObjects - numLocked
    const maxMoves = movable + Math.max(5 - levelNumber, 2)

    return generateBalancePuzzle(seed, {
      numObjects,
      numLocked,
      platformWidth: 440,
      platformHeight: 60,
      maxObjectSize: 46,
      maxMass,
      slotUnit: 28,
      maxSlot: 7,
      maxMoves,
    })
  },

  reducer: (state, action) => {
    if (action.type === 'moveObject' && action.objectId && action.x !== undefined && action.y !== undefined) {
      if (state.movesUsed >= state.maxMoves) return state
      const target = state.bodies.find((b) => b.id === action.objectId)
      if (!target || target.isStatic || target.isLocked) return state

      return {
        ...state,
        bodies: state.bodies.map((body) =>
          body.id === action.objectId
            ? {
                ...body,
                // Objects only ever rest in a notch, so the position is a
                // discrete choice the player can reason about exactly.
                x: snapToSlot(action.x!, PIVOT_X, state.slotUnit, state.maxSlot),
                y: body.y,
              }
            : body,
        ),
        // A puzzle only counts as settled right after an explicit release; an
        // active drag must not be able to trigger a win mid-motion.
        isSettled: false,
      }
    }

    if (action.type === 'settle') {
      // Releasing an object is the commit point: that's what costs a move,
      // and only if it actually ended up somewhere new.
      const changed = state.bodies.some((b) => !b.isStatic && state.committedX[b.id] !== undefined && state.committedX[b.id] !== b.x)
      if (!changed) return { ...state, isSettled: true }

      const committedX = { ...state.committedX }
      state.bodies.forEach((b) => {
        if (!b.isStatic) committedX[b.id] = b.x
      })

      return {
        ...state,
        bodies: state.bodies.map((body) => ({ ...body, velocityY: 0, angularVelocity: 0 })),
        isSettled: true,
        movesUsed: state.movesUsed + 1,
        committedX,
      }
    }

    if (action.type === 'tick' && action.dt !== undefined) {
      // Simple Euler integration for demonstration
      const updated = state.bodies.map((body) => {
        if (body.isStatic) return body

        return {
          ...body,
          y: body.y + body.velocityY * action.dt!,
          velocityY: Math.min(body.velocityY + 9.8 * action.dt!, 10), // Cap velocity
        }
      })

      return {
        ...state,
        bodies: updated,
        isSettled: updated.every((b) => Math.abs(b.velocityY) < 0.1),
      }
    }

    if (action.type === 'reset') {
      return balancePuzzleDefinition.createInitialState(state.seed)
    }

    return state
  },

  isValidAction: (state, action) => {
    if (action.type === 'moveObject' && action.objectId) {
      return state.bodies.some((b) => b.id === action.objectId && !b.isStatic && !b.isLocked)
    }
    return true
  },

  checkWin: (state) => {
    const torque = calculateTorque(state.bodies, PIVOT_X, PIVOT_Y)
    return Math.abs(torque) <= state.targetTorqueTolerance && state.isSettled
  },

  checkFailSafe: (state) => {
    const torque = calculateTorque(state.bodies, PIVOT_X, PIVOT_Y)
    const balanced = Math.abs(torque) <= state.targetTorqueTolerance && state.isSettled
    return !balanced && state.movesUsed >= state.maxMoves
  },

  getHintState: (state, tier: HintTier): BalanceHintState => {
    const torque = calculateTorque(state.bodies, PIVOT_X, PIVOT_Y)
    const movable = state.bodies.filter((b) => !b.isStatic)
    // Heaviest object farthest from the overloaded side is the most effective one to move.
    const heavySide = torque > 0 ? 1 : -1
    const bestCandidate = [...movable].sort((a, b) => {
      const aOnHeavySide = Math.sign(a.x - PIVOT_X) === heavySide ? 1 : 0
      const bOnHeavySide = Math.sign(b.x - PIVOT_X) === heavySide ? 1 : 0
      if (aOnHeavySide !== bOnHeavySide) return bOnHeavySide - aOnHeavySide
      return b.mass - a.mass
    })[0]

    if (Math.abs(torque) <= state.targetTorqueTolerance) {
      return { hint: `Balanced! Let go and it locks in.` }
    }

    const offBy = Math.abs(torque) / state.slotUnit // in mass x notch units

    if (tier >= 4 && bestCandidate) {
      const slots = offBy / bestCandidate.mass
      const direction = torque > 0 ? 'left' : 'right'
      const wholeSlots = Number.isInteger(slots) ? `${slots}` : `about ${slots.toFixed(1)}`
      return {
        hint: `Move the mass-${bestCandidate.mass} block ${wholeSlots} notch${slots === 1 ? '' : 'es'} to the ${direction} — or spread that much across the other blocks.`,
        highlightId: bestCandidate.id,
      }
    }

    if (tier >= 3 && bestCandidate) {
      return {
        hint: `You're off by ${offBy.toFixed(0)} in mass x notches, leaning ${torque > 0 ? 'right' : 'left'}. The highlighted block is the most efficient one to shift.`,
        highlightId: bestCandidate.id,
      }
    }

    if (tier >= 2) {
      const heavier = torque > 0 ? 'right' : 'left'
      return { hint: `Each side's pull is mass x notches from the pivot. The ${heavier} side is pulling harder — make both sides add up to the same number. Locked 🔒 blocks can't be moved.` }
    }

    if (tier >= 1) {
      return { hint: 'Drag blocks between the notches. Each drop costs a move, so plan the arrangement before you start.' }
    }

    return { hint: 'Make mass x notches match on both sides of the pivot.' }
  },

  serialize: (state) => ({
    schemaVersion: 1,
    mechanicId: 'balance',
    payload: state,
  }),

  deserialize: (data) => data.payload as BalanceState,

  reset: (state) => {
    return balancePuzzleDefinition.createInitialState(state.seed)
  },
}
