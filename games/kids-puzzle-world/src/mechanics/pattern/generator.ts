import { createSeededRNG } from '@/shared/rng'
import { PatternSlot, PatternState, PatternRule } from './state'

const RULES: PatternRule[] = ['arithmetic', 'rotation', 'alternating', 'scaling', 'compound']

interface GeneratorParams {
  sequenceLength: number
  numHidden: number
  difficulty: number
}

function generateArithmeticPattern(rng: any, length: number, difficulty: number): { sequence: number[]; params: Record<string, number> } {
  const start = rng.nextInt(0, 20 - difficulty * 3)
  const step = rng.nextInt(1, 3 + difficulty)
  return {
    sequence: Array.from({ length }, (_, i) => start + i * step),
    params: { start, step },
  }
}

function generateRotationPattern(rng: any, length: number, difficulty: number): { sequence: number[]; params: Record<string, number> } {
  const rotations = [0, 90, 180, 270]
  const patternLength = difficulty === 1 ? 2 : difficulty === 2 ? 3 : 2
  const pattern = rng.shuffle(rotations.slice(0, patternLength))
  return {
    sequence: Array.from({ length }, (_, i) => pattern[i % pattern.length]),
    params: { patternLength },
  }
}

function generateAlternatingPattern(rng: any, length: number, difficulty: number): { sequence: number[]; params: Record<string, number> } {
  const a = rng.nextInt(0, 10)
  const b = rng.nextInt(11, 20)
  const skip = difficulty === 1 ? 2 : difficulty === 2 ? 3 : 4
  return {
    sequence: Array.from({ length }, (_, i) => ((i % skip) === 0 ? a : b)),
    params: { a, b, skip },
  }
}

function generateScalingPattern(rng: any, length: number, difficulty: number): { sequence: number[]; params: Record<string, number> } {
  const start = rng.nextInt(1, 4)
  const factor = rng.nextInt(2, 3 + difficulty)
  return {
    sequence: Array.from({ length }, (_, i) => start * Math.pow(factor, i)),
    params: { start, factor },
  }
}

function generateCompoundPattern(rng: any, length: number, difficulty: number): { sequence: number[]; params: Record<string, number> } {
  // Alternates between two arithmetic sequences
  const start1 = rng.nextInt(0, 10)
  const step1 = rng.nextInt(1, 2)
  const start2 = rng.nextInt(20, 30)
  const step2 = rng.nextInt(1, 2)
  return {
    sequence: Array.from({ length }, (_, i) => (i % 2 === 0 ? start1 + (i / 2) * step1 : start2 + ((i - 1) / 2) * step2)),
    params: { start1, step1, start2, step2 },
  }
}

export function generatePatternPuzzle(seed: number, params: Partial<GeneratorParams> = {}): PatternState {
  const { sequenceLength = 5, numHidden = 2, difficulty = 1 } = params

  const rng = createSeededRNG(seed)
  const rule = rng.pick(RULES) as PatternRule

  let sequence: number[] = []
  let ruleParams: Record<string, number> = {}

  switch (rule) {
    case 'arithmetic': {
      const result = generateArithmeticPattern(rng, sequenceLength, difficulty)
      sequence = result.sequence
      ruleParams = result.params
      break
    }
    case 'rotation': {
      const result = generateRotationPattern(rng, sequenceLength, difficulty)
      sequence = result.sequence
      ruleParams = result.params
      break
    }
    case 'alternating': {
      const result = generateAlternatingPattern(rng, sequenceLength, difficulty)
      sequence = result.sequence
      ruleParams = result.params
      break
    }
    case 'scaling': {
      const result = generateScalingPattern(rng, sequenceLength, difficulty)
      sequence = result.sequence
      ruleParams = result.params
      break
    }
    case 'compound': {
      const result = generateCompoundPattern(rng, sequenceLength, difficulty)
      sequence = result.sequence
      ruleParams = result.params
      break
    }
  }

  // Hide the last numHidden slots. A hidden slot's `value` must start empty
  // (null) — seeding it with the correct answer would display the solution
  // before the player does anything, and would make win-checking trivially
  // true (comparing the answer to itself).
  const slots: PatternSlot[] = sequence.map((correctValue, i) => {
    const isVisible = i < sequenceLength - numHidden
    return {
      id: `slot-${i}`,
      correctValue,
      value: isVisible ? correctValue : null,
      isVisible,
    }
  })

  return {
    rule,
    ruleParams,
    slots,
    solvedSlots: new Set(),
    ruleVerified: false,
    seed,
  }
}

export function validatePatternPuzzle(state: PatternState, providedAnswers: Record<string, number>): boolean {
  const hiddenSlots = state.slots.filter((s) => !s.isVisible)

  // Check if all hidden slots have been filled
  if (!hiddenSlots.every((slot) => providedAnswers.hasOwnProperty(slot.id))) {
    return false
  }

  // Check if all provided answers are correct — against correctValue, the
  // ground truth, never against `value` (which is the same field the answer
  // is being compared against — comparing it to itself would always pass).
  return hiddenSlots.every((slot) => {
    const provided = providedAnswers[slot.id]
    return provided !== undefined && provided === slot.correctValue
  })
}
