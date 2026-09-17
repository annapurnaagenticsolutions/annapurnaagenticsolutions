export type PatternRule = 'arithmetic' | 'rotation' | 'alternating' | 'scaling' | 'compound'

export interface PatternSlot {
  id: string
  // The ground-truth answer for this position. Never shown to the player
  // directly for a hidden slot — only `value` is rendered.
  correctValue: number
  // What's currently displayed. For a visible slot this always equals
  // correctValue. For a hidden slot this starts at `null` (empty box) and
  // becomes the player's typed guess — it must NOT be pre-seeded with
  // correctValue, or the puzzle would show its own answer on load.
  value: number | null
  isVisible: boolean
}

export interface PatternState {
  rule: PatternRule
  ruleParams: Record<string, number>
  slots: PatternSlot[]
  solvedSlots: Set<string>
  ruleVerified: boolean
  seed?: number
}
