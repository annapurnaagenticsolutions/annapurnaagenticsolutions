import { createSeededRNG } from '@/shared/rng'
import { GearState, Gear, GearConnection, GearTarget, propagateRotation } from './state'

interface GeneratorParams {
  trunkLength: number // gears in the single chain from the driver before it forks
  numBranches: number // how many separate chains fork off the end of the trunk
  branchLength: number // gears per branch, ending in that branch's target gear
  maxAttempts: number // how many times the player may run the machine
}

const SPEED_MIN = -5
const SPEED_MAX = 5
const SPEED_STEP = 0.25

export function generateGearPuzzle(seed: number, params: Partial<GeneratorParams> = {}): GearState {
  const { trunkLength = 3, numBranches = 1, branchLength = 1, maxAttempts = 5 } = params
  const rng = createSeededRNG(seed)

  // The answer is drawn from the dial's own grid, so the exact required
  // speed is always reachable — and it changes every puzzle, so it can't be
  // memorised the way a fixed "always 2.0" answer could.
  const candidateSpeeds: number[] = []
  for (let v = SPEED_MIN; v <= SPEED_MAX + 1e-9; v += SPEED_STEP) {
    const rounded = Math.round(v * 100) / 100
    if (Math.abs(rounded) >= 0.75) candidateSpeeds.push(rounded)
  }
  const solutionSpeed = rng.pick(candidateSpeeds)

  const gears: Gear[] = []
  const connections: GearConnection[] = []
  let idCounter = 0
  const spacing = 95

  const makeGear = (isDriver: boolean, col: number, row: number): Gear => {
    const teeth = rng.nextInt(12, 30)
    const gear: Gear = {
      id: `gear-${idCounter++}`,
      x: col * spacing + 60,
      y: row * spacing + 60,
      teeth,
      radius: 14 + teeth * 0.6,
      angle: rng.nextInt(0, 360) * (Math.PI / 180),
      angularVelocity: 0,
      isDriver,
    }
    gears.push(gear)
    return gear
  }

  const connect = (from: Gear, to: Gear) => {
    connections.push({
      fromGearId: from.id,
      toGearId: to.id,
      // Meshed gears: ratio is exactly the inverse tooth ratio, and meshing
      // always reverses direction — both are things the player can read off
      // the drawing and reason about.
      ratio: from.teeth / to.teeth,
      invert: true,
    })
  }

  // Trunk: a single chain from the driver. Every branch forks off its last gear.
  let prevGear = makeGear(true, 0, 0)
  for (let i = 1; i < trunkLength; i++) {
    const gear = makeGear(false, i, 0)
    connect(prevGear, gear)
    prevGear = gear
  }
  const forkGear = prevGear

  // Each branch is its own row so the fork is visually obvious once rendered
  // with connection lines — the player has to realize all branches share the
  // same driver input and solve for a speed that satisfies every one at once.
  const targets: GearTarget[] = []
  for (let b = 0; b < numBranches; b++) {
    let branchPrev = forkGear
    for (let i = 0; i < branchLength; i++) {
      const gear = makeGear(false, trunkLength + i, b + 1)
      connect(branchPrev, gear)
      branchPrev = gear
    }
    targets.push({ gearId: branchPrev.id, targetAngularVelocity: 0 })
  }

  // Derive each target's true required speed by actually propagating the
  // solution speed through the real ratio/invert chain — never a guessed
  // constant — so the puzzle's answer is provably reachable, and setting
  // exactly `solutionSpeed` reproduces these values bit-for-bit.
  const referenceState: GearState = {
    gears: gears.map((g) => ({ ...g, angularVelocity: g.isDriver ? solutionSpeed : 0 })),
    connections,
    targets: [],
    tolerance: 0.01,
    stagedSpeed: 0,
    isEngaged: false,
    attemptsUsed: 0,
    maxAttempts,
    speedMin: SPEED_MIN,
    speedMax: SPEED_MAX,
    speedStep: SPEED_STEP,
  }
  const propagated = propagateRotation(referenceState)
  const velocityById = new Map(propagated.gears.map((g) => [g.id, g.angularVelocity]))
  targets.forEach((t) => {
    t.targetAngularVelocity = velocityById.get(t.gearId) ?? 0
  })

  return {
    gears: gears.map((g) => ({ ...g, angularVelocity: 0 })),
    connections,
    targets,
    // Tight on purpose: only the exact right speed passes, so the player has
    // to work the ratios out rather than land near enough by scrubbing.
    tolerance: 0.01,
    stagedSpeed: 0,
    isEngaged: false,
    attemptsUsed: 0,
    maxAttempts,
    speedMin: SPEED_MIN,
    speedMax: SPEED_MAX,
    speedStep: SPEED_STEP,
    seed,
  }
}

export function validateGearPuzzle(state: GearState, tolerance: number = 0.01): boolean {
  if (state.targets.length === 0) return false
  return state.targets.every((t) => {
    const gear = state.gears.find((g) => g.id === t.gearId)
    return gear !== undefined && Math.abs(gear.angularVelocity - t.targetAngularVelocity) <= tolerance
  })
}
