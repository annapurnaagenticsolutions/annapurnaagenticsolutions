import { PuzzleDefinition, HintTier } from '@/runtime/types'
import { GearState, propagateRotation, integrateGearRotation } from './state'
import { generateGearPuzzle, validateGearPuzzle } from './generator'
import { levelNumberFromSeed } from '@/shared/rng'

export interface GearAction {
  type: 'tick' | 'setDriverSpeed' | 'engage' | 'reset'
  dt?: number
  speed?: number
}

export type GearHintState = { hint: string; highlightGearIds?: string[] }

// Difficulty curve: a longer trunk before the fork, more branches, longer
// branches — and fewer attempts to get it right. One driver speed must
// satisfy every branch's target at once, and only an exact match counts.
function difficultyParams(levelNumber: number) {
  const trunkLength = Math.min(2 + levelNumber, 6)
  const numBranches = Math.min(1 + Math.floor(levelNumber / 2), 4)
  const branchLength = Math.min(1 + Math.floor((levelNumber - 1) / 2), 3)
  const maxAttempts = Math.max(6 - Math.floor((levelNumber - 1) / 2), 3)
  return { trunkLength, numBranches, branchLength, maxAttempts }
}

function computeRequiredDriverSpeed(state: GearState, targetGearId: string, targetVelocity: number): number | null {
  const driverGear = state.gears.find((g) => g.isDriver)
  if (!driverGear) return null

  const queue: Array<{ id: string; ratio: number }> = [{ id: driverGear.id, ratio: 1 }]
  const visited = new Set([driverGear.id])
  let head = 0
  while (head < queue.length) {
    const { id, ratio } = queue[head++]
    if (id === targetGearId) return ratio === 0 ? null : targetVelocity / ratio
    state.connections
      .filter((c) => c.fromGearId === id)
      .forEach((conn) => {
        if (!visited.has(conn.toGearId)) {
          visited.add(conn.toGearId)
          queue.push({ id: conn.toGearId, ratio: ratio * conn.ratio * (conn.invert ? -1 : 1) })
        }
      })
  }
  return null
}

export const gearPuzzleDefinition: PuzzleDefinition<GearState, GearAction, GearHintState> = {
  metadata: {
    id: 'gear-001',
    mechanicId: 'gear',
    title: 'Gear Factory Puzzle',
    regionId: 'gear-factory',
    difficulty: { level: 1, params: { trunkLength: 3, numBranches: 1, branchLength: 1 } },
    seed: 42,
  },

  createInitialState: (seed = 1_000_000) => {
    const levelNumber = levelNumberFromSeed(seed)
    return generateGearPuzzle(seed, difficultyParams(levelNumber))
  },

  reducer: (state, action) => {
    if (action.type === 'setDriverSpeed' && action.speed !== undefined) {
      // Dialling a speed only STAGES it. The machine stops, nothing
      // propagates, and no attempt is consumed — so scrubbing the dial can
      // neither reveal the answer nor trip the win condition.
      return {
        ...state,
        stagedSpeed: action.speed,
        isEngaged: false,
        gears: state.gears.map((g) => ({ ...g, angularVelocity: 0 })),
      }
    }

    if (action.type === 'engage') {
      if (state.attemptsUsed >= state.maxAttempts) return state
      const withNewSpeed = {
        ...state,
        gears: state.gears.map((g) => (g.isDriver ? { ...g, angularVelocity: state.stagedSpeed } : g)),
        isEngaged: true,
        attemptsUsed: state.attemptsUsed + 1,
      }
      return propagateRotation(withNewSpeed)
    }

    if (action.type === 'tick' && action.dt !== undefined) {
      if (!state.isEngaged) return state
      const propagated = propagateRotation(state)
      return integrateGearRotation(propagated, action.dt)
    }

    if (action.type === 'reset') {
      return gearPuzzleDefinition.createInitialState(state.seed)
    }

    return state
  },

  isValidAction: (state, action) => {
    if (action.type === 'engage') return state.attemptsUsed < state.maxAttempts
    return true
  },

  checkWin: (state) => {
    // Only a machine that has actually been run can be correct.
    return state.isEngaged && validateGearPuzzle(state, state.tolerance)
  },

  checkFailSafe: (state) => {
    const solved = state.isEngaged && validateGearPuzzle(state, state.tolerance)
    return !solved && state.attemptsUsed >= state.maxAttempts
  },

  getHintState: (state, tier: HintTier): GearHintState => {
    if (state.targets.length === 0) return { hint: 'Configure the gears.' }

    const targetsWithGears = state.targets
      .map((t) => ({ target: t, gear: state.gears.find((g) => g.id === t.gearId) }))
      .filter((t): t is { target: (typeof state.targets)[number]; gear: NonNullable<ReturnType<typeof state.gears.find>> } => !!t.gear)

    const allHighlights = targetsWithGears.map((t) => t.gear.id)
    const branchNote = state.targets.length > 1 ? ` All ${state.targets.length} branches share the one driver, so a single speed has to satisfy every one of them.` : ''

    if (tier >= 3 && targetsWithGears.length > 0) {
      const first = targetsWithGears[0]
      const requiredDriverSpeed = computeRequiredDriverSpeed(state, first.target.gearId, first.target.targetAngularVelocity)
      return {
        hint: requiredDriverSpeed !== null ? `Set the dial to ${requiredDriverSpeed.toFixed(2)} rad/s, then press Engage.` : `Work backwards from a target through each gear's tooth count.`,
        highlightGearIds: allHighlights,
      }
    }

    if (tier >= 2) {
      return {
        hint: `Two meshed gears divide speed by their tooth ratio and reverse direction. Work backwards from a red target gear to the driver.${branchNote}`,
        highlightGearIds: allHighlights,
      }
    }

    if (tier >= 1) {
      return {
        hint: `Dial in a speed, then press Engage to run the machine. Each run costs one attempt, so work it out first.${branchNote}`,
        highlightGearIds: allHighlights,
      }
    }

    return { hint: `Make every red target gear turn at exactly its required speed — all at the same time.` }
  },

  serialize: (state) => ({
    schemaVersion: 1,
    mechanicId: 'gear',
    payload: state,
  }),

  deserialize: (data) => data.payload as GearState,

  reset: (state) => {
    return gearPuzzleDefinition.createInitialState(state.seed)
  },
}
