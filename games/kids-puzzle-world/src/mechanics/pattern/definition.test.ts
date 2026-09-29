import { describe, expect, it } from 'vitest'
import { PuzzleRuntime } from '@/runtime/types'
import { patternPuzzleDefinition } from './definition'

function runtime() { return new PuzzleRuntime(patternPuzzleDefinition, 1_000_042) }
function answerAll(puzzle: ReturnType<typeof runtime>) {
  for (const slot of puzzle.currentState.slots.filter((item) => !item.isVisible)) {
    puzzle.dispatch({ type: 'fillSlot', slotId: slot.id, value: slot.correctValue })
  }
}

describe('Pattern answer confirmation', () => {
  it('waits for an explicit check before awarding a completed puzzle', () => {
    const puzzle = runtime()
    answerAll(puzzle)
    expect(puzzle.status).toBe('playing')
    expect(puzzle.currentState.ruleVerified).toBe(false)
    puzzle.dispatch({ type: 'submit' })
    expect(puzzle.status).toBe('won')
  })

  it('rejects incomplete and incorrect submissions, then permits a corrected answer', () => {
    const puzzle = runtime()
    puzzle.dispatch({ type: 'submit' })
    expect(puzzle.status).toBe('playing')
    answerAll(puzzle)
    const slot = puzzle.currentState.slots.find((item) => !item.isVisible)!
    const wrong = puzzle.currentState.rule === 'rotation' ? (slot.correctValue + 90) % 360 : slot.correctValue + 1
    puzzle.dispatch({ type: 'fillSlot', slotId: slot.id, value: wrong })
    puzzle.dispatch({ type: 'submit' })
    expect(puzzle.status).toBe('playing')
    puzzle.dispatch({ type: 'fillSlot', slotId: slot.id, value: slot.correctValue })
    expect(puzzle.status).toBe('playing')
    puzzle.dispatch({ type: 'submit' })
    expect(puzzle.status).toBe('won')
  })

  it('clearing an answer invalidates it and reset restores an unverified puzzle', () => {
    const puzzle = runtime()
    answerAll(puzzle)
    const slot = puzzle.currentState.slots.find((item) => !item.isVisible)!
    puzzle.dispatch({ type: 'clearSlot', slotId: slot.id })
    puzzle.dispatch({ type: 'submit' })
    expect(puzzle.status).toBe('playing')
    answerAll(puzzle)
    puzzle.dispatch({ type: 'submit' })
    puzzle.reset()
    expect(puzzle.status).toBe('idle')
    expect(puzzle.currentState.ruleVerified).toBe(false)
    expect(puzzle.currentState.slots.filter((item) => !item.isVisible).every((item) => item.value === null)).toBe(true)
  })

  it.each([NaN, Infinity, -Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects invalid numeric input %s', (value) => {
    const puzzle = runtime()
    const before = puzzle.currentState
    puzzle.dispatch({ type: 'fillSlot', slotId: before.slots.find((item) => !item.isVisible)!.id, value })
    expect(puzzle.currentState).toBe(before)
  })
})
