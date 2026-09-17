import { describe, it, expect } from 'vitest'
import { createSeededRNG } from './rng'

describe('Seeded RNG', () => {
  it('should produce same sequence for same numeric seed', () => {
    const rng1 = createSeededRNG(12345)
    const rng2 = createSeededRNG(12345)

    const seq1 = [rng1.next(), rng1.next(), rng1.next()]
    const seq2 = [rng2.next(), rng2.next(), rng2.next()]

    expect(seq1).toEqual(seq2)
  })

  it('should produce same sequence for same string seed', () => {
    const rng1 = createSeededRNG('test-seed')
    const rng2 = createSeededRNG('test-seed')

    const seq1 = [rng1.next(), rng1.next(), rng1.next()]
    const seq2 = [rng2.next(), rng2.next(), rng2.next()]

    expect(seq1).toEqual(seq2)
  })

  it('should produce different sequences for different seeds', () => {
    const rng1 = createSeededRNG(12345)
    const rng2 = createSeededRNG(54321)

    const val1 = rng1.next()
    const val2 = rng2.next()

    expect(val1).not.toBe(val2)
  })

  it('should generate integers in range', () => {
    const rng = createSeededRNG(12345)

    for (let i = 0; i < 100; i++) {
      const val = rng.nextInt(1, 10)
      expect(val).toBeGreaterThanOrEqual(1)
      expect(val).toBeLessThanOrEqual(10)
    }
  })

  it('should shuffle arrays deterministically', () => {
    const rng1 = createSeededRNG('shuffle-test')
    const rng2 = createSeededRNG('shuffle-test')

    const arr1 = [1, 2, 3, 4, 5]
    const arr2 = [1, 2, 3, 4, 5]

    const shuffled1 = rng1.shuffle(arr1)
    const shuffled2 = rng2.shuffle(arr2)

    expect(shuffled1).toEqual(shuffled2)
    expect(arr1).toEqual([1, 2, 3, 4, 5]) // Original unchanged
  })

  it('should pick items deterministically', () => {
    const rng1 = createSeededRNG('pick-test')
    const rng2 = createSeededRNG('pick-test')

    const items = ['a', 'b', 'c', 'd', 'e']

    const picks1 = [rng1.pick(items), rng1.pick(items), rng1.pick(items)]
    const picks2 = [rng2.pick(items), rng2.pick(items), rng2.pick(items)]

    expect(picks1).toEqual(picks2)
  })

  it('should return values between 0 and 1', () => {
    const rng = createSeededRNG(12345)

    for (let i = 0; i < 100; i++) {
      const val = rng.next()
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(1)
    }
  })
})
