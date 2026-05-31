import { describe, it, expect } from 'vitest'
import { generateText } from './textgen'
import { mulberry32 } from './rng'

describe('generateText', () => {
  it('is deterministic for the same seed (word mode)', () => {
    const a = generateText('duration', 'fr', mulberry32(42))
    const b = generateText('duration', 'fr', mulberry32(42))
    expect(a).toBe(b)
    expect(a.length).toBeGreaterThan(0)
  })

  it('produces different text for different seeds', () => {
    const a = generateText('duration', 'en', mulberry32(1))
    const b = generateText('duration', 'en', mulberry32(2))
    expect(a).not.toBe(b)
  })

  it('quote mode returns one of the quotes deterministically', () => {
    const a = generateText('quote', 'fr', mulberry32(99))
    const b = generateText('quote', 'fr', mulberry32(99))
    expect(a).toBe(b)
  })

  it('code mode returns a snippet deterministically', () => {
    const a = generateText('code', 'en', mulberry32(5))
    const b = generateText('code', 'en', mulberry32(5))
    expect(a).toBe(b)
  })
})
