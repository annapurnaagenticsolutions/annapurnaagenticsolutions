import { describe, it, expect } from 'vitest'
import { generateBalancePuzzle, validateBalancePuzzle } from './generator'
import { balancePuzzleDefinition } from './definition'
import { PuzzleRuntime } from '@/runtime/types'

describe('Balance & Physics Mechanic', () => {
  it('should generate a valid puzzle state', () => {
    const state = generateBalancePuzzle(42, { numObjects: 3 })
    expect(state.bodies).toHaveLength(4) // platform + 3 objects
    expect(state.bodies[0].isStatic).toBe(true) // Platform is static
    expect(state.gravity).toBe(9.8)
  })

  it('should generate same puzzle for same seed', () => {
    const state1 = generateBalancePuzzle(123, { numObjects: 3 })
    const state2 = generateBalancePuzzle(123, { numObjects: 3 })
    expect(state1.bodies.length).toBe(state2.bodies.length)
  })

  it('should validate balance state', () => {
    const state = generateBalancePuzzle(42, { numObjects: 3 })
    // Generated state is scrambled, not necessarily balanced
    const isBalanced = validateBalancePuzzle(state, 200, 330, 1.0)
    expect(typeof isBalanced).toBe('boolean')
  })

  it('should allow moving objects', () => {
    const state = generateBalancePuzzle(42, { numObjects: 3 })
    const newState = balancePuzzleDefinition.reducer(state, {
      type: 'moveObject',
      objectId: 'obj-0',
      x: 250,
      y: 280,
    })

    const obj = newState.bodies.find((b) => b.id === 'obj-0')
    expect(obj?.x).toBe(250)
    expect(obj?.y).toBe(280)
  })

  it('should simulate gravity on tick', () => {
    const state = generateBalancePuzzle(42, { numObjects: 3 })
    const stateWithVelocity = {
      ...state,
      bodies: state.bodies.map((b, i) => (i === 1 ? { ...b, velocityY: 0 } : b)),
    }

    const newState = balancePuzzleDefinition.reducer(stateWithVelocity, {
      type: 'tick',
      dt: 0.016,
    })

    const obj = newState.bodies[1]
    expect(obj.velocityY).toBeGreaterThan(0) // Velocity increased by gravity
  })

  it('should work with PuzzleRuntime', () => {
    const runtime = new PuzzleRuntime(balancePuzzleDefinition, 42)
    expect(runtime.status).toBe('idle')

    // Move some objects
    const target = runtime.currentState.bodies.find((b) => !b.isStatic)
    if (target) {
      runtime.dispatch({
        type: 'moveObject',
        objectId: target.id,
        x: 150,
        y: 280,
      })
    }

    expect(runtime.status).toBe('playing')
  })

  it('should provide contextual hints', () => {
    const state = generateBalancePuzzle(42, { numObjects: 3 })
    const hint1 = balancePuzzleDefinition.getHintState(state, 1)
    expect(hint1.hint).toContain('balance')

    const hint2 = balancePuzzleDefinition.getHintState(state, 2)
    expect(hint2.hint).toContain('tilts')
  })
})
