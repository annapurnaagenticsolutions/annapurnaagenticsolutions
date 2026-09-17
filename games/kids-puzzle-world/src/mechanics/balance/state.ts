export interface Body {
  id: string
  x: number
  y: number
  width: number
  height: number
  mass: number
  isStatic: boolean
  // Bolted to the beam: still contributes torque, but can't be moved. The
  // player has to balance around it rather than rearranging everything.
  isLocked?: boolean
  velocityX: number
  velocityY: number
  angle: number
  angularVelocity: number
}

export interface BalanceState {
  bodies: Body[]
  gravity: number
  isSettled: boolean
  torqueAroundPivot: number
  targetTorqueTolerance: number
  // Objects sit in numbered notches, not anywhere along the beam. That turns
  // this from "nudge until the meter goes green" into an actual arithmetic
  // problem: pick notches so that every mass x distance cancels exactly.
  slotUnit: number
  maxSlot: number
  // One move = one object dropped in a new notch. Limited, so the placement
  // has to be worked out rather than found by trial and error.
  movesUsed: number
  maxMoves: number
  committedX: Record<string, number>
  seed?: number
}

export function slotOf(x: number, pivotX: number, slotUnit: number): number {
  return Math.round((x - pivotX) / slotUnit)
}

export function snapToSlot(x: number, pivotX: number, slotUnit: number, maxSlot: number): number {
  const slot = Math.max(-maxSlot, Math.min(maxSlot, slotOf(x, pivotX, slotUnit)))
  return pivotX + slot * slotUnit
}

export function createDefaultBody(id: string, x: number, y: number, width: number, height: number, mass: number, isStatic: boolean = false): Body {
  return {
    id,
    x,
    y,
    width,
    height,
    mass,
    isStatic,
    velocityX: 0,
    velocityY: 0,
    angle: 0,
    angularVelocity: 0,
  }
}

export function calculateCenterOfMass(bodies: Body[]): { x: number; y: number; totalMass: number } {
  let totalMass = 0
  let sumMassX = 0
  let sumMassY = 0

  bodies.forEach((body) => {
    if (!body.isStatic) {
      totalMass += body.mass
      sumMassX += body.x * body.mass
      sumMassY += body.y * body.mass
    }
  })

  return {
    x: totalMass > 0 ? sumMassX / totalMass : 0,
    y: totalMass > 0 ? sumMassY / totalMass : 0,
    totalMass,
  }
}

// Torque on a horizontal beam is mass times the SIGNED horizontal lever arm
// (left of the pivot cancels right of the pivot). The previous version used
// unsigned Euclidean distance (sqrt(dx^2+dy^2)), which sums to a large
// positive number for every possible arrangement — no placement could ever
// cancel out, so the puzzle could never register a win no matter how objects
// were dragged.
export function calculateTorque(bodies: Body[], pivotX: number, _pivotY: number): number {
  let torque = 0

  bodies.forEach((body) => {
    if (!body.isStatic) {
      torque += body.mass * (body.x - pivotX)
    }
  })

  return torque
}
