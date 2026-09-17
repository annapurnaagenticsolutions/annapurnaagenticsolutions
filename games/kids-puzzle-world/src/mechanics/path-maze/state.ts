export interface GridCell {
  x: number
  y: number
  type: 'floor' | 'wall' | 'goal' | 'switch' | 'gate' | 'key' | 'door' | 'gem'
  switchId?: string
  gateId?: string
  keyId?: string
  doorId?: string
  gemId?: string
}

export interface Player {
  x: number
  y: number
  // Keys collected so far. Permanent for the run — picking one up never
  // expires it, so a door just checks "have you ever found this key",
  // which keeps the state space small while still forcing real exploration
  // order (you cannot reach a door before its key).
  inventory: Set<string>
}

// A gate opens only once EVERY one of its switchIds is currently toggled on
// (AND logic) — a single-switch gate is just switchIds.length === 1. Because
// switches toggle (stepping on one again turns it back off), this state
// lives outside the gate and is recomputed live, not stored on the gate.
export interface Gate {
  id: string
  switchIds: string[]
}

export interface Door {
  id: string
  requiredKeyId: string
}

export interface PathMazeState {
  gridWidth: number
  gridHeight: number
  grid: GridCell[][]
  player: Player
  gates: Gate[]
  doors: Door[]
  activeSwitches: Set<string>
  // Every gem must be collected before the exit will open, so the maze can't
  // be beaten by beelining for the goal — the whole layout has to be routed.
  gemsCollected: Set<string>
  totalGems: number
  // A step budget derived from the true optimal solution length. Wandering
  // is no longer free: the route has to be planned before it's walked.
  movesUsed: number
  maxMoves: number
  goalPosition: { x: number; y: number }
  isGoalReached: boolean
  seed?: number
}

export function createEmptyGrid(width: number, height: number): GridCell[][] {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      type: 'floor' as const,
    })),
  )
}

export function isGateOpen(gate: Gate, activeSwitches: Set<string>): boolean {
  return gate.switchIds.every((id) => activeSwitches.has(id))
}

export function isWalkable(grid: GridCell[][], x: number, y: number, gates: Gate[], activeSwitches: Set<string>, doors: Door[], inventory: Set<string>): boolean {
  if (x < 0 || y < 0 || x >= grid[0].length || y >= grid.length) return false
  const cell = grid[y][x]
  if (cell.type === 'wall') return false
  if (cell.type === 'gate') {
    const gate = gates.find((g) => g.id === cell.gateId)
    return gate ? isGateOpen(gate, activeSwitches) : false
  }
  if (cell.type === 'door') {
    const door = doors.find((d) => d.id === cell.doorId)
    return door ? inventory.has(door.requiredKeyId) : false
  }
  return true
}

export function movePlayer(state: PathMazeState, dx: number, dy: number): PathMazeState {
  // Out of steps, or already finished — the maze stops accepting input.
  if (state.isGoalReached || state.movesUsed >= state.maxMoves) return state

  const newX = state.player.x + dx
  const newY = state.player.y + dy

  if (!isWalkable(state.grid, newX, newY, state.gates, state.activeSwitches, state.doors, state.player.inventory)) {
    return state
  }

  const cellAtNewPos = state.grid[newY][newX]
  let activeSwitches = state.activeSwitches
  let inventory = state.player.inventory
  let gemsCollected = state.gemsCollected

  if (cellAtNewPos.type === 'switch' && cellAtNewPos.switchId) {
    activeSwitches = new Set(activeSwitches)
    if (activeSwitches.has(cellAtNewPos.switchId)) {
      activeSwitches.delete(cellAtNewPos.switchId)
    } else {
      activeSwitches.add(cellAtNewPos.switchId)
    }
  }

  if (cellAtNewPos.type === 'key' && cellAtNewPos.keyId && !inventory.has(cellAtNewPos.keyId)) {
    inventory = new Set(inventory)
    inventory.add(cellAtNewPos.keyId)
  }

  if (cellAtNewPos.type === 'gem' && cellAtNewPos.gemId && !gemsCollected.has(cellAtNewPos.gemId)) {
    gemsCollected = new Set(gemsCollected)
    gemsCollected.add(cellAtNewPos.gemId)
  }

  // The exit stays shut until every gem is in hand.
  const isGoalReached = newX === state.goalPosition.x && newY === state.goalPosition.y && gemsCollected.size >= state.totalGems

  return {
    ...state,
    player: { ...state.player, x: newX, y: newY, inventory },
    activeSwitches,
    gemsCollected,
    movesUsed: state.movesUsed + 1,
    isGoalReached,
  }
}

// BFS from the player's current position toward the most useful next target:
// an unopened gate's switches, a needed key, or the goal itself — whichever
// is actually reachable right now given the current switches/keys held.
export function getNextStepDirection(state: PathMazeState): { dx: number; dy: number; kind: 'switch' | 'key' | 'gem' | 'goal' } | null {
  const lockedGates = state.gates.filter((g) => !isGateOpen(g, state.activeSwitches))
  const neededSwitchIds = new Set(lockedGates.flatMap((g) => g.switchIds.filter((id) => !state.activeSwitches.has(id))))
  const lockedDoors = state.doors.filter((d) => !state.player.inventory.has(d.requiredKeyId))
  const neededKeyIds = new Set(lockedDoors.map((d) => d.requiredKeyId))
  const gemsOutstanding = state.gemsCollected.size < state.totalGems

  const targets: Array<{ x: number; y: number; kind: 'switch' | 'key' | 'gem' | 'goal' }> = []
  state.grid.flat().forEach((c) => {
    if (c.type === 'switch' && c.switchId && neededSwitchIds.has(c.switchId)) targets.push({ x: c.x, y: c.y, kind: 'switch' })
    if (c.type === 'key' && c.keyId && neededKeyIds.has(c.keyId)) targets.push({ x: c.x, y: c.y, kind: 'key' })
    if (c.type === 'gem' && c.gemId && !state.gemsCollected.has(c.gemId)) targets.push({ x: c.x, y: c.y, kind: 'gem' })
  })
  // Heading for the exit is pointless while gems are still out there.
  if (!gemsOutstanding) targets.push({ ...state.goalPosition, kind: 'goal' })

  const targetLookup = new Map(targets.map((t) => [`${t.x},${t.y}`, t.kind]))
  const startKey = `${state.player.x},${state.player.y}`
  const seen = new Set([startKey])
  const queue: Array<{ x: number; y: number; firstStep: { dx: number; dy: number } | null }> = [{ x: state.player.x, y: state.player.y, firstStep: null }]
  let head = 0

  while (head < queue.length) {
    const { x, y, firstStep } = queue[head++]
    const hit = targetLookup.get(`${x},${y}`)
    if (hit && firstStep) {
      return { ...firstStep, kind: hit }
    }

    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ] as const) {
      const nx = x + dx
      const ny = y + dy
      if (!isWalkable(state.grid, nx, ny, state.gates, state.activeSwitches, state.doors, state.player.inventory)) continue
      const key = `${nx},${ny}`
      if (!seen.has(key)) {
        seen.add(key)
        queue.push({ x: nx, y: ny, firstStep: firstStep ?? { dx, dy } })
      }
    }
  }

  return null
}
