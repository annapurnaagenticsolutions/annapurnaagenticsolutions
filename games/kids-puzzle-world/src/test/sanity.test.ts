import { describe, it, expect } from 'vitest'

describe('Sanity tests', () => {
  it('should pass a basic arithmetic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle strings', () => {
    expect('hello'.toUpperCase()).toBe('HELLO')
  })
})
