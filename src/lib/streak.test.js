import { describe, it, expect } from 'vitest'
import { updateStreak } from './streak'

describe('updateStreak', () => {
  it('increments on correct char', () => {
    expect(updateStreak(0, true)).toBe(1)
    expect(updateStreak(5, true)).toBe(6)
  })

  it('resets to 0 on error', () => {
    expect(updateStreak(10, false)).toBe(0)
    expect(updateStreak(0, false)).toBe(0)
  })

  it('does not go below 0', () => {
    expect(updateStreak(0, false)).toBe(0)
  })
})
