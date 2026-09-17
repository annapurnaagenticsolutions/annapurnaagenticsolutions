import { createSeededRNG } from '@/shared/rng'
import { BalanceState, Body, createDefaultBody, calculateTorque } from './state'

interface GeneratorParams {
  numObjects: number
  numLocked: number // objects bolted in place that still weigh on the beam
  platformWidth: number
  platformHeight: number
  maxObjectSize: number
  maxMass: number
  slotUnit: number // pixel spacing between notches
  maxSlot: number // notches available either side of the pivot
  maxMoves: number
}

export function generateBalancePuzzle(seed: number, params: Partial<GeneratorParams> = {}): BalanceState {
  const {
    numObjects = 4,
    numLocked = 0,
    platformWidth = 440,
    platformHeight = 60,
    maxObjectSize = 46,
    maxMass = 6,
    slotUnit = 28,
    maxSlot = 7,
    maxMoves = 8,
  } = params

  const platformY = 300
  const pivotX = 220
  const pivotY = platformY + platformHeight / 2
  const platform = createDefaultBody('platform', pivotX, pivotY, platformWidth, platformHeight, Infinity, true)

  // Never lock so many that the player has no freedom left to solve with.
  const lockedCount = Math.max(0, Math.min(numLocked, numObjects - 2))

  // Build a layout that balances EXACTLY on the notch grid: pick integer
  // notches for all but one object, then solve the last one's notch. It only
  // counts if that notch is a whole number inside the beam — otherwise the
  // draw is thrown away and retried, so the puzzle always has a reachable
  // exact answer rather than an approximate one.
  let solvedSlots: number[] = []
  let masses: number[] = []
  let sizes: number[] = []

  const MAX_ATTEMPTS = 200
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = createSeededRNG(seed + attempt * 104729)
    const attemptMasses: number[] = []
    const attemptSizes: number[] = []
    const attemptSlots: number[] = new Array(numObjects)

    for (let i = 0; i < numObjects; i++) {
      attemptMasses.push(rng.nextInt(1, Math.max(maxMass, 1)))
      attemptSizes.push(rng.nextInt(20, Math.min(maxObjectSize, 60)))
    }

    let partialTorque = 0
    for (let i = 0; i < numObjects - 1; i++) {
      let slot = rng.nextInt(-maxSlot, maxSlot)
      if (slot === 0) slot = 1 // parking on the pivot is a freebie; keep it interesting
      attemptSlots[i] = slot
      partialTorque += attemptMasses[i] * slot
    }

    const last = numObjects - 1
    const lastMass = attemptMasses[last]
    if (partialTorque % lastMass !== 0) continue // no whole-notch solution for this draw
    const lastSlot = -partialTorque / lastMass
    if (lastSlot === 0 || Math.abs(lastSlot) > maxSlot) continue

    attemptSlots[last] = lastSlot
    solvedSlots = attemptSlots
    masses = attemptMasses
    sizes = attemptSizes
    break
  }

  if (solvedSlots.length === 0) {
    // Exhausted attempts (only realistically possible for pathological
    // params) — equal-mass mirrored pairs always balance exactly.
    masses = Array.from({ length: numObjects }, () => 2)
    sizes = Array.from({ length: numObjects }, () => 30)
    solvedSlots = Array.from({ length: numObjects }, (_, i) => (i % 2 === 0 ? -1 : 1) * (1 + Math.floor(i / 2)))
    if (numObjects % 2 === 1) solvedSlots[numObjects - 1] = 0
  }

  // Locked objects are bolted at their solved notch, so a solution still
  // exists — the movable ones just have to balance around them.
  const rng = createSeededRNG(seed + 999983)
  const scrambledBodies: Body[] = [platform]
  const committedX: Record<string, number> = {}

  for (let i = 0; i < numObjects; i++) {
    const isLocked = i < lockedCount
    let slot = solvedSlots[i]
    if (!isLocked) {
      // Scramble movable objects to some other notch so the board never
      // starts solved.
      for (let tries = 0; tries < 20; tries++) {
        const candidate = rng.nextInt(-maxSlot, maxSlot)
        if (candidate !== solvedSlots[i]) {
          slot = candidate
          break
        }
      }
    }
    const size = sizes[i]
    const x = pivotX + slot * slotUnit
    const body = createDefaultBody(`obj-${i}`, x, platformY - size / 2, size, size, masses[i], false)
    body.isLocked = isLocked
    scrambledBodies.push(body)
    committedX[body.id] = x
  }

  // If the scramble happened to land on a balanced arrangement, nudge one
  // movable object so the player always has something to actually do.
  const movable = scrambledBodies.filter((b) => !b.isStatic && !b.isLocked)
  if (Math.abs(calculateTorque(scrambledBodies, pivotX, pivotY)) < 1e-9 && movable.length > 0) {
    const target = movable[0]
    const currentSlot = Math.round((target.x - pivotX) / slotUnit)
    const shifted = currentSlot >= maxSlot ? currentSlot - 1 : currentSlot + 1
    target.x = pivotX + shifted * slotUnit
    committedX[target.id] = target.x
  }

  return {
    bodies: scrambledBodies,
    gravity: 9.8,
    isSettled: false,
    torqueAroundPivot: calculateTorque(scrambledBodies, pivotX, pivotY),
    // Notches make the answer exact, so this only absorbs float noise —
    // "close enough" is no longer good enough.
    targetTorqueTolerance: 0.01,
    slotUnit,
    maxSlot,
    movesUsed: 0,
    maxMoves,
    committedX,
    seed,
  }
}

export function validateBalancePuzzle(state: BalanceState, pivotX: number, pivotY: number, maxTolerance: number = 1.0): boolean {
  const torque = calculateTorque(state.bodies, pivotX, pivotY)
  return Math.abs(torque) <= maxTolerance
}
