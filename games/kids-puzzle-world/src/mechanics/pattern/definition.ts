import { PuzzleDefinition, HintTier } from '@/runtime/types'
import { PatternState } from './state'
import { generatePatternPuzzle, validatePatternPuzzle } from './generator'
import { levelNumberFromSeed } from '@/shared/rng'

export interface PatternAction {
  type: 'fillSlot' | 'clearSlot' | 'submit' | 'reset'
  slotId?: string
  value?: number
}

export type PatternHintState = { hint: string; highlightIds?: string[] }

const RULE_EXPLANATIONS: Record<string, string> = {
  arithmetic: 'Each number increases by the same amount',
  rotation: 'The angles repeat in a cycle',
  alternating: 'Numbers alternate between two values',
  scaling: 'Each number multiplies by the same factor',
  compound: 'Two patterns alternate with each other',
}

export const patternPuzzleDefinition: PuzzleDefinition<PatternState, PatternAction, PatternHintState> = {
  metadata: {
    id: 'pattern-001',
    mechanicId: 'pattern',
    title: 'Pattern Forest Puzzle',
    regionId: 'pattern-forest',
    difficulty: { level: 1, params: { sequenceLength: 5, numHidden: 2 } },
    seed: 42,
  },

  createInitialState: (seed = 1_000_000) => {
    // Difficulty scales deterministically with level number (1-5+); the
    // remaining seed entropy still varies the concrete puzzle per play.
    const levelNumber = levelNumberFromSeed(seed)
    const difficulty = Math.min(levelNumber, 3)

    return generatePatternPuzzle(seed, {
      sequenceLength: Math.min(5 + Math.floor((levelNumber - 1) / 2), 7),
      numHidden: Math.min(2 + Math.floor(difficulty / 2), 3),
      difficulty,
    })
  },

  reducer: (state, action) => {
    if (action.type === 'fillSlot' && action.slotId && action.value !== undefined) {
      const updatedSlots = state.slots.map((slot) =>
        slot.id === action.slotId ? { ...slot, value: action.value! } : slot,
      )

      return {
        ...state,
        slots: updatedSlots,
        solvedSlots: new Set([...state.solvedSlots, action.slotId]),
      }
    }

    if (action.type === 'clearSlot' && action.slotId) {
      const newSolved = new Set([...state.solvedSlots].filter((id) => id !== action.slotId))
      // Cleared means "empty box" (null), not 0 — 0 is a legitimate answer
      // and must stay distinguishable from "not yet answered".
      const clearedSlots = state.slots.map((s) => (s.id === action.slotId ? { ...s, value: null } : s))
      return {
        ...state,
        slots: clearedSlots,
        solvedSlots: newSolved,
      }
    }

    if (action.type === 'submit') {
      const answers: Record<string, number> = {}
      const hiddenSlots = state.slots.filter((s) => !s.isVisible)

      hiddenSlots.forEach((slot) => {
        if (slot.value !== null) {
          answers[slot.id] = slot.value
        }
      })

      const isValid = validatePatternPuzzle(state, answers)

      return {
        ...state,
        ruleVerified: isValid,
      }
    }

    if (action.type === 'reset') {
      return patternPuzzleDefinition.createInitialState(state.seed)
    }

    return state
  },

  isValidAction: (state, action) => {
    if (action.type === 'fillSlot' && action.slotId) {
      return state.slots.some((s) => s.id === action.slotId && !s.isVisible)
    }
    if (action.type === 'clearSlot' && action.slotId) {
      return state.slots.some((s) => s.id === action.slotId && !s.isVisible)
    }
    return true
  },

  checkWin: (state) => {
    const hiddenSlots = state.slots.filter((s) => !s.isVisible)
    // Win requires every hidden slot's player-entered `value` to match its
    // `correctValue` — two genuinely distinct fields. (The previous version
    // compared a slot's `value` field to itself via a second lookup that
    // resolved to the identical object, which is trivially always true —
    // the puzzle was "solved" the instant it was generated.)
    return hiddenSlots.length > 0 && hiddenSlots.every((slot) => slot.value !== null && slot.value === slot.correctValue)
  },

  getHintState: (state, tier: HintTier): PatternHintState => {
    const hiddenSlots = state.slots.filter((s) => !s.isVisible)
    const visibleSlots = state.slots.filter((s) => s.isVisible)
    const unsolvedHidden = hiddenSlots.filter((s) => s.value !== s.correctValue)

    if (tier >= 4) {
      // Reveal the actual next number — only for a slot not yet correct.
      const target = unsolvedHidden[0] ?? hiddenSlots[0]
      return {
        hint: target ? `That box should be: ${target.correctValue}. Try it!` : `Everything checks out — press Check Pattern!`,
        highlightIds: target ? [target.id] : [],
      }
    }

    if (tier >= 3) {
      // Explain the rule
      const ruleExplanation = RULE_EXPLANATIONS[state.rule] || 'Look for a repeating pattern'
      return {
        hint: `Rule: ${ruleExplanation}. Now fill in the blanks!`,
        highlightIds: hiddenSlots.map((s) => s.id),
      }
    }

    if (tier >= 2) {
      // Guide observation
      const visibleStr = visibleSlots.map((s) => s.value).join(', ')
      return {
        hint: `The visible sequence is: ${visibleStr}. What comes next?`,
        highlightIds: hiddenSlots.map((s) => s.id),
      }
    }

    if (tier >= 1) {
      return { hint: `Click empty boxes and enter numbers to complete the pattern.` }
    }

    return { hint: `Find the pattern in the sequence!` }
  },

  serialize: (state) => ({
    schemaVersion: 1,
    mechanicId: 'pattern',
    seed: state.seed,
    payload: {
      ...state,
      solvedSlots: Array.from(state.solvedSlots),
    },
  }),

  deserialize: (data) => {
    const payload = data.payload as any
    return {
      ...payload,
      solvedSlots: new Set(payload.solvedSlots),
      seed: data.seed,
    }
  },

  reset: (state) => {
    return patternPuzzleDefinition.createInitialState(state.seed)
  },
}
