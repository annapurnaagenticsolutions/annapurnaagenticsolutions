import { describe, it, expect } from 'vitest'
import { PuzzleRuntime, PuzzleDefinition, HintTier } from './types'

interface TestState {
  value: number
  steps: number
}

type TestAction = { type: 'increment' } | { type: 'tick'; dt: number }

const createTestDefinition = (): PuzzleDefinition<TestState, TestAction, { hint: string }> => ({
  metadata: {
    id: 'test-puzzle',
    mechanicId: 'pattern',
    title: 'Test Puzzle',
    regionId: 'test-region',
    difficulty: { level: 1, params: {} },
  },

  createInitialState: () => ({
    value: 0,
    steps: 0,
  }),

  reducer: (state, action) => {
    if (action.type === 'increment') {
      return { value: state.value + 1, steps: state.steps + 1 }
    }
    if (action.type === 'tick') {
      return { ...state, steps: state.steps + 1 }
    }
    return state
  },

  isValidAction: () => true,

  checkWin: (state) => state.value >= 3,

  checkFailSafe: (state) => state.steps > 10,

  getHintState: () => ({ hint: 'Increment to 3' }),

  serialize: (state) => ({
    schemaVersion: 1,
    mechanicId: 'pattern',
    payload: state,
  }),

  deserialize: (data) => data.payload as TestState,

  reset: (state) => ({ ...state, value: 0, steps: 0 }),
})

describe('PuzzleRuntime', () => {
  it('should start in idle state', () => {
    const definition = createTestDefinition()
    const runtime = new PuzzleRuntime(definition)
    expect(runtime.status).toBe('idle')
  })

  it('should dispatch actions and update state', () => {
    const definition = createTestDefinition()
    const runtime = new PuzzleRuntime(definition)

    runtime.dispatch({ type: 'increment' })
    expect(runtime.currentState.value).toBe(1)
    expect(runtime.status).toBe('playing')
  })

  it('should detect win condition', () => {
    const definition = createTestDefinition()
    const runtime = new PuzzleRuntime(definition)

    runtime.dispatch({ type: 'increment' })
    runtime.dispatch({ type: 'increment' })
    expect(runtime.status).toBe('playing')

    runtime.dispatch({ type: 'increment' })
    expect(runtime.status).toBe('won')
  })

  it('should detect fail-safe condition', () => {
    const definition = createTestDefinition()
    const runtime = new PuzzleRuntime(definition)

    for (let i = 0; i < 11; i++) {
      runtime.dispatch({ type: 'tick', dt: 0.016 })
    }
    expect(runtime.status).toBe('failed-safe')
  })

  it('should reset to initial state', () => {
    const definition = createTestDefinition()
    const runtime = new PuzzleRuntime(definition)

    runtime.dispatch({ type: 'increment' })
    runtime.dispatch({ type: 'increment' })

    runtime.reset()
    expect(runtime.currentState.value).toBe(0)
    expect(runtime.status).toBe('idle')
  })

  it('should notify subscribers on state changes', () => {
    const definition = createTestDefinition()
    const runtime = new PuzzleRuntime(definition)

    const calls: unknown[] = []
    runtime.subscribe(() => {
      calls.push(runtime.currentState)
    })

    runtime.dispatch({ type: 'increment' })
    expect(calls).toHaveLength(1)
    expect((calls[0] as TestState).value).toBe(1)
  })

  it('should provide hint state', () => {
    const definition = createTestDefinition()
    const runtime = new PuzzleRuntime(definition)

    const hint = runtime.getHintState(1 as HintTier)
    expect(hint).toEqual({ hint: 'Increment to 3' })
  })

  it('should serialize and deserialize state', () => {
    const definition = createTestDefinition()
    const runtime = new PuzzleRuntime(definition)

    runtime.dispatch({ type: 'increment' })
    runtime.dispatch({ type: 'increment' })

    const serialized = runtime.serialize()
    expect(serialized.payload).toEqual({ value: 2, steps: 2 })
  })
})
