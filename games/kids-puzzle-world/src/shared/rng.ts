// Seeded RNG using mulberry32 algorithm for deterministic random generation
// Used for procedural puzzle generation - ensures same seed produces same puzzle

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

export function createSeededRNG(seed: number | string) {
  const numSeed = typeof seed === 'string' ? hashString(seed) : Math.abs(Math.floor(seed))

  let state = numSeed >>> 0

  return {
    next(): number {
      state |= 0
      state = (state + 0x6d2b79f5) | 0
      let t = Math.imul(state ^ (state >>> 15), 1 | state)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },

    nextInt(min: number, max: number): number {
      return Math.floor(this.next() * (max - min + 1)) + min
    },

    shuffle<T>(array: T[]): T[] {
      const result = [...array]
      for (let i = result.length - 1; i > 0; i--) {
        const j = this.nextInt(0, i)
        ;[result[i], result[j]] = [result[j], result[i]]
      }
      return result
    },

    pick<T>(array: T[]): T {
      return array[this.nextInt(0, array.length - 1)]
    },
  }
}

export type SeededRNG = ReturnType<typeof createSeededRNG>

// Seeds are encoded as `levelNumber * 1_000_000 + variety`, so difficulty scales
// deterministically with level while the puzzle itself still varies between plays.
export function levelNumberFromSeed(seed: number): number {
  return Math.max(1, Math.floor(seed / 1_000_000))
}
