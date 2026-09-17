import { createSeededRNG } from '@/shared/rng'
import { PathMazeState, createEmptyGrid, GridCell, Gate, Door } from './state'

interface GeneratorParams {
  gridWidth: number
  gridHeight: number
  numGates: number // total gates to place
  numAndGates: number // how many of those gates require 2 switches (AND) instead of 1
  numKeyDoorPairs: number
  numGems: number // collectibles that must ALL be gathered before the exit opens
  moveSlack: number // step budget = ceil(optimal solution length * this)
  braidFactor: number // 0..1, fraction of removable dead-end walls that get knocked down to create loops
}

const DIRS = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
] as const

function carvePath(grid: GridCell[][], x: number, y: number, rng: any, visited: Set<string>): void {
  const key = `${x},${y}`
  if (visited.has(key)) return

  visited.add(key)
  grid[y][x].type = 'floor'

  const directions = rng.shuffle([
    { dx: 0, dy: -2 },
    { dx: 2, dy: 0 },
    { dx: 0, dy: 2 },
    { dx: -2, dy: 0 },
  ])

  directions.forEach(({ dx, dy }: { dx: number; dy: number }) => {
    const nx = x + dx
    const ny = y + dy
    // Only carve into a cell that hasn't been visited yet — opening the wall
    // unconditionally (as this used to) connects back into already-carved
    // territory too, silently turning the "perfect maze" into a fully
    // looped graph with no bottlenecks anywhere, which is what made every
    // gate/door placeable-but-bypassable regardless of braiding.
    if (nx > 0 && ny > 0 && nx < grid[0].length - 1 && ny < grid.length - 1 && !visited.has(`${nx},${ny}`)) {
      grid[y + dy / 2][x + dx / 2].type = 'floor'
      carvePath(grid, nx, ny, rng, visited)
    }
  })
}

// A perfect (tree) maze has exactly one route between any two points, which
// makes naive strategies like "always turn the same way" work every time.
// Knocking down a fraction of the remaining walls that separate two floor
// cells creates loops and false shortcuts — genuinely harder to navigate by
// eye, while only ever ADDING routes, so it can never break solvability.
function braidMaze(grid: GridCell[][], rng: any, braidFactor: number): void {
  if (braidFactor <= 0) return
  const height = grid.length
  const width = grid[0].length

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (grid[y][x].type !== 'wall') continue
      const horizontalFloors = grid[y][x - 1]?.type === 'floor' && grid[y][x + 1]?.type === 'floor'
      const verticalFloors = grid[y - 1]?.[x]?.type === 'floor' && grid[y + 1]?.[x]?.type === 'floor'
      if ((horizontalFloors || verticalFloors) && rng.next() < braidFactor) {
        grid[y][x].type = 'floor'
      }
    }
  }
}

// Every cell reachable from `start` while treating (blockX, blockY) as a
// wall and every gate/door elsewhere as freely open. Used two ways: (1) if
// goal isn't in this set, the blocked cell is a genuine chokepoint — a
// gate/door placed there can't be bypassed by any braided shortcut; (2) it's
// also exactly the set of cells that are safe to put that gate/door's
// switch or key on, since anything outside it would be unreachable before
// the gate/door itself (a deadlock).
function reachableWithoutCell(grid: GridCell[][], start: { x: number; y: number }, blockX: number, blockY: number): Set<string> {
  const seen = new Set([`${start.x},${start.y}`])
  const queue: Array<{ x: number; y: number }> = [{ x: start.x, y: start.y }]
  let head = 0

  while (head < queue.length) {
    const { x, y } = queue[head++]
    for (const [dx, dy] of DIRS) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || ny >= grid.length || nx >= grid[0].length) continue
      if (nx === blockX && ny === blockY) continue
      if (grid[ny][nx].type === 'wall') continue
      const key = `${nx},${ny}`
      if (!seen.has(key)) {
        seen.add(key)
        queue.push({ x: nx, y: ny })
      }
    }
  }

  return seen
}

function isCellMandatory(grid: GridCell[][], start: { x: number; y: number }, goal: { x: number; y: number }, blockX: number, blockY: number): boolean {
  return !reachableWithoutCell(grid, start, blockX, blockY).has(`${goal.x},${goal.y}`)
}

// The unique shortest route from start to goal (ignoring locks). Every
// gate/door candidate is drawn from this path first: a cell on the shortest
// route is far more likely to be a genuine chokepoint than a random floor
// cell, which turns "test every candidate with an O(V) BFS" into "test a
// handful of good candidates" — the difference between instant and multi-
// second generation once mazes get large.
function shortestPathCells(grid: GridCell[][], start: { x: number; y: number }, goal: { x: number; y: number }): Array<{ x: number; y: number }> {
  const startKey = `${start.x},${start.y}`
  const goalKey = `${goal.x},${goal.y}`
  const seen = new Set([startKey])
  const prev = new Map<string, { x: number; y: number }>()
  const queue: Array<{ x: number; y: number }> = [{ x: start.x, y: start.y }]
  let head = 0

  while (head < queue.length) {
    const { x, y } = queue[head++]
    if (`${x},${y}` === goalKey) break
    for (const [dx, dy] of DIRS) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || ny >= grid.length || nx >= grid[0].length) continue
      if (grid[ny][nx].type === 'wall') continue
      const key = `${nx},${ny}`
      if (!seen.has(key)) {
        seen.add(key)
        prev.set(key, { x, y })
        queue.push({ x: nx, y: ny })
      }
    }
  }

  if (!seen.has(goalKey)) return []

  const path: Array<{ x: number; y: number }> = []
  let cur = { x: goal.x, y: goal.y }
  while (`${cur.x},${cur.y}` !== startKey) {
    path.push(cur)
    cur = prev.get(`${cur.x},${cur.y}`)!
  }
  return path
}

// BFS over (x, y, switchMask, keyMask, gemMask) — the full state a player's
// progress can be in. A gate needs every one of its switchIds active (AND);
// a door needs its key ever collected; the exit only counts once every gem
// is held. Returns the SHORTEST number of steps to actually finish, which
// serves two purposes: it proves the layout is solvable at all (any layout
// this can't clear is thrown away and regenerated), and it's the basis for
// the move budget — a limit derived from real optimal play, not guesswork.
//
// State keys are packed into a single number (not a template-string
// concatenation) — this search can visit hundreds of thousands of states,
// and string allocation/hashing per state is the difference between this
// taking milliseconds vs seconds.
function shortestSolutionLength(
  grid: GridCell[][],
  start: { x: number; y: number },
  goal: { x: number; y: number },
  gates: Gate[],
  doors: Door[],
  gemIds: string[],
): number | null {
  const switchIds = [...new Set(gates.flatMap((g) => g.switchIds))]
  const switchIndex = new Map(switchIds.map((id, i) => [id, i]))
  const keyIds = doors.map((d) => d.requiredKeyId)
  const keyIndex = new Map(keyIds.map((id, i) => [id, i]))
  const gemIndex = new Map(gemIds.map((id, i) => [id, i]))
  const gateMaskById = new Map(gates.map((g) => [g.id, g.switchIds.reduce((m, id) => m | (1 << switchIndex.get(id)!), 0)]))
  const doorKeyIdxById = new Map(doors.map((d) => [d.id, keyIndex.get(d.requiredKeyId)!]))
  const allGemsMask = (1 << gemIds.length) - 1

  const width = grid[0].length
  const switchSpace = 1 << switchIds.length
  const keySpace = 1 << keyIds.length
  const gemSpace = 1 << gemIds.length
  const packState = (x: number, y: number, s: number, k: number, g: number) => (((x * grid.length + y) * switchSpace + s) * keySpace + k) * gemSpace + g

  // Hard safety valve: this search is only ever exponential in
  // switches+keys+gems (bounded and deliberately kept small by the
  // difficulty curve), but a generator embedded in a live app must never be
  // able to hang or crash no matter what edge case a particular seed hits.
  // Bailing out just makes this one attempt fail and retry with a different
  // seed — never a stuck or broken puzzle.
  const STATE_LIMIT = 1_200_000
  const seen = new Set([packState(start.x, start.y, 0, 0, 0)])
  const queue: Array<{ x: number; y: number; switchMask: number; keyMask: number; gemMask: number; dist: number }> = [
    { x: start.x, y: start.y, switchMask: 0, keyMask: 0, gemMask: 0, dist: 0 },
  ]
  let head = 0

  while (head < queue.length) {
    if (seen.size > STATE_LIMIT) return null
    const { x, y, switchMask, keyMask, gemMask, dist } = queue[head++]
    if (x === goal.x && y === goal.y && gemMask === allGemsMask) return dist

    for (const [dx, dy] of DIRS) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || ny >= grid.length || nx >= width) continue
      const cell = grid[ny][nx]
      if (cell.type === 'wall') continue

      let nextSwitchMask = switchMask
      let nextKeyMask = keyMask
      let nextGemMask = gemMask

      if (cell.type === 'gate' && cell.gateId) {
        const mask = gateMaskById.get(cell.gateId)
        if (mask === undefined || (switchMask & mask) !== mask) continue // not all required switches active
      }
      if (cell.type === 'door' && cell.doorId) {
        const keyIdx = doorKeyIdxById.get(cell.doorId)
        if (keyIdx === undefined || !((keyMask >> keyIdx) & 1)) continue
      }
      if (cell.type === 'switch' && cell.switchId) {
        // Switches TOGGLE — stepping on one again turns it back off, which is
        // exactly what movePlayer does. Modelling this as a one-way "on"
        // would certify routes the real game refuses (re-crossing a switch
        // shuts its own gate), so the search has to toggle too or the
        // solvability guarantee and the step budget are both unsound.
        const idx = switchIndex.get(cell.switchId)
        if (idx !== undefined) nextSwitchMask = switchMask ^ (1 << idx)
      }
      if (cell.type === 'key' && cell.keyId) {
        const idx = keyIndex.get(cell.keyId)
        if (idx !== undefined) nextKeyMask = keyMask | (1 << idx)
      }
      if (cell.type === 'gem' && cell.gemId) {
        const idx = gemIndex.get(cell.gemId)
        if (idx !== undefined) nextGemMask = gemMask | (1 << idx)
      }

      const packed = packState(nx, ny, nextSwitchMask, nextKeyMask, nextGemMask)
      if (!seen.has(packed)) {
        seen.add(packed)
        queue.push({ x: nx, y: ny, switchMask: nextSwitchMask, keyMask: nextKeyMask, gemMask: nextGemMask, dist: dist + 1 })
      }
    }
  }

  return null
}

function buildEmptyMaze(seed: number, gridWidth: number, gridHeight: number): PathMazeState {
  const rng = createSeededRNG(seed)
  const grid = createEmptyGrid(gridWidth, gridHeight)
  grid.forEach((row) => row.forEach((cell) => (cell.type = 'wall')))
  carvePath(grid, 1, 1, rng, new Set())

  const goalX = gridWidth - 2
  const goalY = gridHeight - 2
  grid[1][1].type = 'floor'
  grid[goalY][goalX].type = 'goal'

  const fallbackLength = shortestSolutionLength(grid, { x: 1, y: 1 }, { x: goalX, y: goalY }, [], [], []) ?? gridWidth * gridHeight

  return {
    gridWidth,
    gridHeight,
    grid,
    player: { x: 1, y: 1, inventory: new Set() },
    gates: [],
    doors: [],
    activeSwitches: new Set(),
    gemsCollected: new Set(),
    totalGems: 0,
    movesUsed: 0,
    maxMoves: Math.ceil(fallbackLength * 3),
    goalPosition: { x: goalX, y: goalY },
    isGoalReached: false,
    seed,
  }
}

export function generatePathMazePuzzle(seed: number, params: Partial<GeneratorParams> = {}): PathMazeState {
  const { gridWidth = 11, gridHeight = 11, numGates = 1, numAndGates = 0, numKeyDoorPairs = 0, numGems = 0, moveSlack = 2.5, braidFactor = 0 } = params
  const clampedAndGates = Math.min(numAndGates, numGates)

  const MAX_ATTEMPTS = 100
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = createSeededRNG(seed + attempt * 7919)

    const grid = createEmptyGrid(gridWidth, gridHeight)
    grid.forEach((row) => row.forEach((cell) => (cell.type = 'wall')))
    carvePath(grid, 1, 1, rng, new Set())
    braidMaze(grid, rng, braidFactor)

    const startX = 1
    const startY = 1
    const goalX = gridWidth - 2
    const goalY = gridHeight - 2
    grid[startY][startX].type = 'floor'
    grid[goalY][goalX].type = 'goal'

    let availableCells = grid.flat().filter((c) => c.type === 'floor' && !(c.x === startX && c.y === startY) && !(c.x === goalX && c.y === goalY))

    // Each AND-gate needs 2 switch cells + 1 gate cell; each single-switch
    // gate needs 1 switch cell + 1 gate cell; each key/door pair needs 2 cells.
    const singleGates = numGates - clampedAndGates
    const switchesNeeded = singleGates + clampedAndGates * 2
    const cellsNeeded = switchesNeeded + numGates + numKeyDoorPairs * 2 + numGems
    if (availableCells.length < cellsNeeded + 4) continue

    const start = { x: startX, y: startY }
    const goal = { x: goalX, y: goalY }
    const pathCellKeys = shortestPathCells(grid, start, goal).map((c) => `${c.x},${c.y}`)

    // Picks a cell whose removal actually disconnects start from goal — a
    // genuine chokepoint. A gate/door placed anywhere else is bypassable by
    // construction (there's already another route around it), which is
    // exactly the "grab the key and the level just ends anyway" bug this
    // fixes: every gate/door must be mandatory, not decorative. Shortest-path
    // cells are tried first since they're overwhelmingly more likely to
    // qualify than a random floor cell, keeping this fast even on big mazes.
    function pickMandatoryCell(candidates: GridCell[]): GridCell | null {
      const onPath: GridCell[] = []
      const offPath: GridCell[] = []
      for (const c of candidates) (pathCellKeys.includes(`${c.x},${c.y}`) ? onPath : offPath).push(c)

      for (const candidate of rng.shuffle(onPath)) {
        if (isCellMandatory(grid, start, goal, candidate.x, candidate.y)) return candidate
      }
      for (const candidate of rng.shuffle(offPath)) {
        if (isCellMandatory(grid, start, goal, candidate.x, candidate.y)) return candidate
      }
      return null
    }

    let placementFailed = false

    // Place gates first (each on a genuine chokepoint), then place each
    // gate's switch(es) ONLY among cells reachable from start WITHOUT that
    // gate — otherwise a switch could land on the far side of its own gate,
    // an unreachable deadlock that would only be caught later as "unsolvable"
    // and waste a whole regeneration attempt.
    const gates: Gate[] = []
    let switchCounter = 0
    for (let g = 0; g < numGates && !placementFailed; g++) {
      const isAndGate = g < clampedAndGates
      const arity = isAndGate ? 2 : 1

      const gateCell = pickMandatoryCell(availableCells)
      if (!gateCell) {
        placementFailed = true
        break
      }
      availableCells = availableCells.filter((c) => c !== gateCell)

      const reachableBeforeGate = reachableWithoutCell(grid, start, gateCell.x, gateCell.y)
      let sideCandidates = availableCells.filter((c) => reachableBeforeGate.has(`${c.x},${c.y}`))

      const switchIdsForGate: string[] = []
      for (let s = 0; s < arity; s++) {
        if (sideCandidates.length === 0) {
          placementFailed = true
          break
        }
        const switchCell = rng.pick(sideCandidates)
        sideCandidates = sideCandidates.filter((c) => c !== switchCell)
        availableCells = availableCells.filter((c) => c !== switchCell)
        const switchId = `switch-${switchCounter++}`
        switchCell.type = 'switch'
        switchCell.switchId = switchId
        switchIdsForGate.push(switchId)
      }
      if (placementFailed) break

      const gateId = `gate-${g}`
      gateCell.type = 'gate'
      gateCell.gateId = gateId
      gates.push({ id: gateId, switchIds: switchIdsForGate })
    }

    if (placementFailed) continue

    // Place key/door pairs — the door must be a mandatory chokepoint, and its
    // key must land on the reachable side of that same door (same deadlock
    // concern as switches above).
    const doors: Door[] = []
    for (let k = 0; k < numKeyDoorPairs; k++) {
      if (availableCells.length < 2) {
        placementFailed = true
        break
      }
      const doorCell = pickMandatoryCell(availableCells)
      if (!doorCell) {
        placementFailed = true
        break
      }
      availableCells = availableCells.filter((c) => c !== doorCell)

      const reachableBeforeDoor = reachableWithoutCell(grid, start, doorCell.x, doorCell.y)
      const doorSideCandidates = availableCells.filter((c) => reachableBeforeDoor.has(`${c.x},${c.y}`))
      if (doorSideCandidates.length === 0) {
        placementFailed = true
        break
      }
      const keyCell = rng.pick(doorSideCandidates)
      availableCells = availableCells.filter((c) => c !== keyCell)

      const keyId = `key-${k}`
      keyCell.type = 'key'
      keyCell.keyId = keyId

      const doorId = `door-${k}`
      doorCell.type = 'door'
      doorCell.doorId = doorId
      doors.push({ id: doorId, requiredKeyId: keyId })
    }

    if (placementFailed) continue

    // Gems never block movement, so they can sit anywhere — but because the
    // exit stays locked until all of them are held, they force the player to
    // route through the whole maze rather than beeline for the goal.
    const gemIds: string[] = []
    for (let g = 0; g < numGems; g++) {
      if (availableCells.length === 0) {
        placementFailed = true
        break
      }
      const gemCell = rng.pick(availableCells)
      availableCells = availableCells.filter((c) => c !== gemCell)
      const gemId = `gem-${g}`
      gemCell.type = 'gem'
      gemCell.gemId = gemId
      gemIds.push(gemId)
    }

    if (placementFailed) continue

    // One search proves the layout is beatable AND measures optimal play,
    // which is what the step budget is scaled from.
    const optimalLength = shortestSolutionLength(grid, start, goal, gates, doors, gemIds)
    if (optimalLength === null) continue

    return {
      gridWidth,
      gridHeight,
      grid,
      player: { x: startX, y: startY, inventory: new Set() },
      gates,
      doors,
      activeSwitches: new Set(),
      gemsCollected: new Set(),
      totalGems: gemIds.length,
      movesUsed: 0,
      maxMoves: Math.ceil(optimalLength * moveSlack),
      goalPosition: { x: goalX, y: goalY },
      isGoalReached: false,
      seed,
    }
  }

  return buildEmptyMaze(seed, gridWidth, gridHeight)
}

export function validatePathMazePuzzle(state: PathMazeState): boolean {
  const gemIds = state.grid
    .flat()
    .filter((c) => c.type === 'gem' && c.gemId)
    .map((c) => c.gemId!)
  return shortestSolutionLength(state.grid, { x: state.player.x, y: state.player.y }, state.goalPosition, state.gates, state.doors, gemIds) !== null
}
