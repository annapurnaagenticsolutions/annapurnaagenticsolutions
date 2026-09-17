import { describe, it, expect } from 'vitest'
import { PuzzleRuntime } from '@/runtime/types'
import { seedPuzzleDefinition } from './definition'

describe('Seed Puzzle Definition', () => {
  it('should create initial state with target', () => {
    const state = seedPuzzleDefinition.createInitialState(42)
    expect(state.target).toBeGreaterThanOrEqual(3)
    expect(state.target).toBeLessThanOrEqual(8)
    expect(state.current).toBe(0)
    expect(state.moves).toBe(0)
  })

  it('should be deterministic for same seed', () => {
    expect(seedPuzzleDefinition.createInitialState(123)).toEqual(seedPuzzleDefinition.createInitialState(123))
  })

  it('should increment via reducer', () => {
    const state = seedPuzzleDefinition.createInitialState(42)
    const newState = seedPuzzleDefinition.reducer(state, { type: 'increment' })
    expect(newState.current).toBe(1)
    expect(newState.moves).toBe(1)
  })

  it('should detect win condition when current equals target', () => {
    let state = seedPuzzleDefinition.createInitialState(42)
    expect(seedPuzzleDefinition.checkWin(state)).toBe(false)
    for (let i = 0; i < state.target; i++) state = seedPuzzleDefinition.reducer(state, { type: 'increment' })
    expect(seedPuzzleDefinition.checkWin(state)).toBe(true)
  })

  it('should work with PuzzleRuntime', () => {
    const runtime = new PuzzleRuntime(seedPuzzleDefinition, 42)
    expect(runtime.status).toBe('idle')
    const targetValue = runtime.currentState.target
    for (let i = 0; i < targetValue; i++) runtime.dispatch({ type: 'increment' })
    expect(runtime.status).toBe('won')
    expect(runtime.currentState.moves).toBe(targetValue)
  })

  it('should serialize and deserialize the generated state', () => {
    const runtime = new PuzzleRuntime(seedPuzzleDefinition, 42)
    runtime.dispatch({ type: 'increment' })
    runtime.dispatch({ type: 'increment' })
    const serialized = runtime.serialize()
    expect(serialized.payload).toEqual({
      target: runtime.currentState.target,
      current: 2,
      moves: 2,
    })
  })

  it('should reset state correctly', () => {
    const runtime = new PuzzleRuntime(seedPuzzleDefinition, 42)
    runtime.dispatch({ type: 'increment' })
    runtime.dispatch({ type: 'increment' })
    runtime.reset()
    expect(runtime.currentState.current).toBe(0)
    expect(runtime.currentState.moves).toBe(0)
    expect(runtime.status).toBe('idle')
  })
})
