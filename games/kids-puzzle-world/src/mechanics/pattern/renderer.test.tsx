import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PuzzleRuntime } from '@/runtime/types'
import { patternPuzzleDefinition } from './definition'
import { PatternState } from './state'
import PatternRenderer from './renderer'

function fixture(rule: 'rotation' | 'arithmetic' = 'rotation') {
  const state: PatternState = {
    rule, ruleParams: {}, ruleVerified: false, solvedSlots: new Set(), seed: 1,
    slots: [0, 90, 0, 90, 0].map((correctValue, index) => ({ id: `slot-${index}`, correctValue, value: index < 3 ? correctValue : null, isVisible: index < 3 })),
  }
  return new PuzzleRuntime({ ...patternPuzzleDefinition, createInitialState: () => state, reset: () => ({ ...state, slots: state.slots.map((slot) => ({ ...slot })), solvedSlots: new Set<string>() }) })
}

describe('Pattern controls', () => {
  it('offers labelled direction choices and requires the check button to complete', () => {
    const puzzle = fixture()
    render(<PatternRenderer runtime={puzzle} />)
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Point right' }))
    fireEvent.click(screen.getByRole('button', { name: /Choose arrow for place 5/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Point up' }))
    expect(puzzle.status).toBe('playing')
    fireEvent.click(screen.getByRole('button', { name: 'Check Pattern' }))
    expect(puzzle.status).toBe('won')
    expect(screen.getByText('You found the pattern!')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reset puzzle' }))
    expect(puzzle.status).toBe('idle')
  })

  it('explains missing answers and exposes labelled numeric answers for number patterns', () => {
    render(<PatternRenderer runtime={fixture('arithmetic')} />)
    expect(screen.getByRole('spinbutton', { name: 'Answer for place 4' })).toBeTruthy()
    expect(screen.getByRole('spinbutton', { name: 'Answer for place 5' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Check Pattern' }))
    expect(screen.getByText('Fill every empty place, then try again.')).toBeTruthy()
  })
})
