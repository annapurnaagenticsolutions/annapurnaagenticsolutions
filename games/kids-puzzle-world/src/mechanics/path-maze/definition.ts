import { PuzzleDefinition, HintTier } from '@/runtime/types'
import { PathMazeState, movePlayer, getNextStepDirection, isGateOpen } from './state'
import { generatePathMazePuzzle } from './generator'
import { levelNumberFromSeed } from '@/shared/rng'

export interface PathMazeAction {
  type: 'move' | 'reset'
  dx?: number
  dy?: number
}

export type PathMazeHintState = { hint: string }

const DIRECTION_NAMES: Record<string, string> = {
  '0,-1': 'up',
  '0,1': 'down',
  '-1,0': 'left',
  '1,0': 'right',
}

// Difficulty curve: much bigger mazes, many more gates (most requiring two
// switches active at once), several key/door chains, and heavier braiding so
// a simple "always turn right" strategy stops working almost immediately.
// Every generated layout is still verified solvable and every gate/door is
// still verified mandatory (see generator.ts) — this only controls scale.
function difficultyParams(levelNumber: number) {
  const size = Math.min(15 + (levelNumber - 1) * 2, 23)
  const numGates = Math.min(1 + Math.floor(levelNumber / 1.5), 4)
  const numAndGates = Math.min(Math.floor(levelNumber / 2), numGates)
  const numKeyDoorPairs = Math.min(Math.floor((levelNumber + 1) / 2), 3)
  // Gems lock the exit, so all of them must be routed through — this is what
  // turns the maze from "find the way out" into a route-planning problem.
  const numGems = Math.min(Math.floor((levelNumber + 1) / 2), 3)
  // Step budget as a multiple of true optimal play. The whole maze is
  // visible, so near-optimal routing is genuinely possible — but by level 5
  // there's very little room for wandering.
  const moveSlack = Math.max(2.6 - (levelNumber - 1) * 0.28, 1.5)
  // Braiding and gate/door placement compete for the same "mandatory
  // chokepoint" cells (more loops means fewer bottlenecks left to place a
  // gate on), so this is capped more conservatively than gate/key counts —
  // still enough to defeat naive wall-following, without starving placement.
  const braidFactor = Math.min(0.06 + (levelNumber - 1) * 0.02, 0.16)

  return {
    gridWidth: size % 2 === 0 ? size + 1 : size,
    gridHeight: size % 2 === 0 ? size + 1 : size,
    numGates,
    numAndGates,
    numKeyDoorPairs,
    numGems,
    moveSlack,
    braidFactor,
  }
}

export const pathMazePuzzleDefinition: PuzzleDefinition<PathMazeState, PathMazeAction, PathMazeHintState> = {
  metadata: {
    id: 'path-001',
    mechanicId: 'path',
    title: 'Maze Mountain Puzzle',
    regionId: 'maze-mountain',
    difficulty: { level: 1, params: { gridWidth: 13, gridHeight: 13, numGates: 1 } },
    seed: 42,
  },

  createInitialState: (seed = 1_000_000) => {
    const levelNumber = levelNumberFromSeed(seed)
    return generatePathMazePuzzle(seed, difficultyParams(levelNumber))
  },

  reducer: (state, action) => {
    if (action.type === 'move' && action.dx !== undefined && action.dy !== undefined) {
      return movePlayer(state, action.dx, action.dy)
    }

    if (action.type === 'reset') {
      return pathMazePuzzleDefinition.createInitialState(state.seed)
    }

    return state
  },

  isValidAction: (state, action) => {
    if (action.type === 'move') {
      return action.dx !== undefined && action.dy !== undefined && Math.abs(action.dx) + Math.abs(action.dy) === 1
    }
    return true
  },

  checkWin: (state) => state.isGoalReached,

  checkFailSafe: (state) => !state.isGoalReached && state.movesUsed >= state.maxMoves,

  getHintState: (state, tier: HintTier): PathMazeHintState => {
    const gemsLeft = state.totalGems - state.gemsCollected.size

    if (tier >= 3) {
      const step = getNextStepDirection(state)
      if (step) {
        const dirName = DIRECTION_NAMES[`${step.dx},${step.dy}`] ?? 'forward'
        const targetName =
          step.kind === 'switch' ? 'a switch you still need' : step.kind === 'key' ? 'a key you still need' : step.kind === 'gem' ? 'a gem you still need' : 'the exit'
        return { hint: `Try moving ${dirName} — that heads toward ${targetName}.` }
      }
      return { hint: `Hmm, keep exploring — there may be more of the maze to uncover.` }
    }

    if (tier >= 2) {
      const lockedGates = state.gates.filter((g) => !isGateOpen(g, state.activeSwitches))
      const lockedDoors = state.doors.filter((d) => !state.player.inventory.has(d.requiredKeyId))
      if (gemsLeft > 0) {
        return { hint: `The exit stays shut until you hold all the gems — ${gemsLeft} still out there. Plan a route that sweeps them all up; you have limited steps.` }
      }
      if (lockedGates.some((g) => g.switchIds.length > 1)) {
        return { hint: `One gate needs TWO switches active at the same time — find both before it will open.` }
      }
      if (lockedDoors.length > 0) {
        return { hint: `There's a locked door somewhere. Find its matching key first.` }
      }
      if (lockedGates.length > 0) {
        return { hint: `There's a closed gate blocking part of the maze. Find its switch to open it.` }
      }
      return { hint: `All gems collected — the exit is open. Head for it.` }
    }

    if (tier >= 1) {
      return { hint: `Arrow keys or WASD to move. Collect every gem first, then reach the exit — and watch your step count.` }
    }

    return { hint: `Collect all the gems, then find the exit — before you run out of steps.` }
  },

  serialize: (state) => ({
    schemaVersion: 1,
    mechanicId: 'path',
    seed: state.seed,
    payload: {
      ...state,
      player: { ...state.player, inventory: Array.from(state.player.inventory) },
      activeSwitches: Array.from(state.activeSwitches),
      gemsCollected: Array.from(state.gemsCollected),
    },
  }),

  deserialize: (data) => {
    const payload = data.payload as any
    return {
      ...payload,
      player: { ...payload.player, inventory: new Set(payload.player.inventory) },
      activeSwitches: new Set(payload.activeSwitches),
      gemsCollected: new Set(payload.gemsCollected ?? []),
      seed: data.seed,
    }
  },

  reset: (state) => {
    return pathMazePuzzleDefinition.createInitialState(state.seed)
  },
}
