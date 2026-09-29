import { describe, expect, it } from 'vitest'
import { generatePatternPuzzle, validatePatternPuzzle } from './generator'

describe('pattern puzzle evidence', () => {
  it('exposes a repeated cycle or enough terms at every supported difficulty', () => {
    const seen = new Set<string>()
    for (const difficulty of [1, 2, 3]) {
      for (let seed = 0; seed < 200; seed += 1) {
        const state = generatePatternPuzzle(seed, { sequenceLength: 5, numHidden: 3, difficulty })
        seen.add(state.rule)
        const minimumVisible = state.rule === 'rotation' ? state.ruleParams.patternLength + 1
          : state.rule === 'alternating' ? state.ruleParams.skip + 1
          : state.rule === 'compound' ? 4 : 3
        expect(state.slots.filter(slot => slot.isVisible).length).toBeGreaterThanOrEqual(minimumVisible)
        expect(state.slots.filter(slot => !slot.isVisible)).toHaveLength(3)
      }
    }
    expect(seen.size).toBe(5)
  })
  it('shows two examples of each compound sequence before asking for answers', () => {
    let compoundPuzzles = 0
    for (let seed = 0; seed < 200; seed += 1) {
      const state = generatePatternPuzzle(seed, { sequenceLength: 5, numHidden: 2, difficulty: 1 })
      if (state.rule !== 'compound') continue
      compoundPuzzles += 1
      const visible = state.slots.filter(slot => slot.isVisible)
      const hidden = state.slots.filter(slot => !slot.isVisible)
      expect(visible.length).toBeGreaterThanOrEqual(4)
      expect(hidden).toHaveLength(2)
      const firstStep = visible[2].value! - visible[0].value!
      const secondStep = visible[3].value! - visible[1].value!
      const answers = Object.fromEntries(hidden.map((slot, index) => [
        slot.id, index % 2 === 0 ? visible[2].value! + firstStep : visible[3].value! + secondStep,
      ]))
      expect(validatePatternPuzzle(state, answers)).toBe(true)
    }
    expect(compoundPuzzles).toBeGreaterThan(0)
  })
})
