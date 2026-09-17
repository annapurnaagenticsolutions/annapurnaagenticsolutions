export interface Gear {
  id: string
  x: number
  y: number
  radius: number
  // Integer tooth count — the ratio between two meshed gears is exactly
  // teeth_from / teeth_to, so a player can compute the answer by hand
  // instead of hunting for it. Radius is derived from this for drawing.
  teeth: number
  angle: number
  angularVelocity: number
  isDriver: boolean
}

export interface GearConnection {
  fromGearId: string
  toGearId: string
  ratio: number
  invert: boolean
}

export interface GearTarget {
  gearId: string
  targetAngularVelocity: number
}

export interface GearState {
  gears: Gear[]
  connections: GearConnection[]
  // Multiple simultaneous targets (a branching gear train) — the single
  // driver speed must satisfy every one of them at once.
  targets: GearTarget[]
  tolerance: number
  // The speed the player has dialled in but NOT yet run. Moving the dial
  // does nothing on its own: the machine only spins (and the puzzle is only
  // checked) on an explicit `engage`. Without this split, sweeping the
  // slider across its range passes through the answer and auto-wins.
  stagedSpeed: number
  isEngaged: boolean
  attemptsUsed: number
  maxAttempts: number
  speedMin: number
  speedMax: number
  speedStep: number
  seed?: number
}

export function propagateRotation(state: GearState): GearState {
  const angles: Record<string, number> = {}
  const velocities: Record<string, number> = {}

  // Initialize from driver gears
  state.gears.forEach((gear) => {
    angles[gear.id] = gear.angle
    velocities[gear.id] = gear.angularVelocity
  })

  // Propagate through connections (simple BFS)
  const visited = new Set<string>()
  const queue = state.gears.filter((g) => g.isDriver).map((g) => g.id)

  while (queue.length > 0) {
    const gearId = queue.shift()!
    if (visited.has(gearId)) continue
    visited.add(gearId)

    // Find all connected gears
    state.connections.forEach((conn) => {
      if (conn.fromGearId === gearId) {
        const targetVelocity = velocities[gearId] * conn.ratio
        velocities[conn.toGearId] = conn.invert ? -targetVelocity : targetVelocity

        if (!visited.has(conn.toGearId)) {
          queue.push(conn.toGearId)
        }
      }
    })
  }

  return {
    ...state,
    gears: state.gears.map((gear) => ({
      ...gear,
      angularVelocity: velocities[gear.id] || 0,
    })),
  }
}

export function integrateGearRotation(state: GearState, dt: number): GearState {
  return {
    ...state,
    gears: state.gears.map((gear) => ({
      ...gear,
      angle: (gear.angle + gear.angularVelocity * dt) % (Math.PI * 2),
    })),
  }
}
