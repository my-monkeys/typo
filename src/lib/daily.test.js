import { describe, it, expect } from 'vitest'
import { getDailyText } from './daily'

const fr = ['bonjour', 'monde', 'chat', 'chien', 'soleil']
const en = ['hello', 'world', 'cat', 'dog', 'sun']

describe('getDailyText', () => {
  it('returns a string from the correct language array', () => {
    const result = getDailyText('fr', fr, en)
    expect(fr).toContain(result)
  })

  it('returns from EN array for lang en', () => {
    const result = getDailyText('en', fr, en)
    expect(en).toContain(result)
  })

  it('is deterministic — same call returns same value', () => {
    const a = getDailyText('fr', fr, en)
    const b = getDailyText('fr', fr, en)
    expect(a).toBe(b)
  })
})
