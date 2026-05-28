import { describe, it, expect, beforeEach } from 'vitest'
import { bestKey, getBest, setBest } from './storage'

describe('bestKey', () => {
  it('builds key for duration mode', () => {
    expect(bestKey('duration', 30, 'fr')).toBe('typo_best_duration_30_fr')
  })

  it('builds key for quote mode', () => {
    expect(bestKey('quote', null, 'en')).toBe('typo_best_quote_en')
  })

  it('builds key for code mode', () => {
    expect(bestKey('code', null, 'fr')).toBe('typo_best_code')
  })

  it('builds key for daily mode includes today and lang', () => {
    const today = new Date().toISOString().slice(0, 10)
    expect(bestKey('daily', null, 'fr')).toBe(`typo_best_daily_${today}_fr`)
    expect(bestKey('daily', null, 'en')).toBe(`typo_best_daily_${today}_en`)
  })
})

describe('getBest / setBest', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when no best score saved', () => {
    expect(getBest('typo_best_duration_30_fr')).toBeNull()
  })

  it('saves and retrieves a best score', () => {
    setBest('typo_best_duration_30_fr', 75)
    expect(getBest('typo_best_duration_30_fr')).toBe(75)
  })

  it('overwrites previous best', () => {
    setBest('typo_best_duration_30_fr', 75)
    setBest('typo_best_duration_30_fr', 80)
    expect(getBest('typo_best_duration_30_fr')).toBe(80)
  })
})
