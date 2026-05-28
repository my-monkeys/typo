import { describe, it, expect } from 'vitest'
import { calcWPM, calcAccuracy } from './metrics'

describe('calcWPM', () => {
  it('returns 0 when elapsed is 0', () => {
    expect(calcWPM(50, 0)).toBe(0)
  })

  it('calculates WPM correctly: 50 correct chars in 30s = 20 WPM', () => {
    // (50 chars / 5) / (30 / 60) = 10 / 0.5 = 20
    expect(calcWPM(50, 30)).toBe(20)
  })

  it('calculates WPM correctly: 300 correct chars in 60s = 60 WPM', () => {
    // (300 / 5) / (60 / 60) = 60 / 1 = 60
    expect(calcWPM(300, 60)).toBe(60)
  })

  it('rounds to nearest integer', () => {
    // (51 / 5) / (30 / 60) = 10.2 / 0.5 = 20.4 → 20
    expect(calcWPM(51, 30)).toBe(20)
  })
})

describe('calcAccuracy', () => {
  it('returns 100 when all chars are correct', () => {
    expect(calcAccuracy(50, 50)).toBe(100)
  })

  it('returns 100 when total is 0', () => {
    expect(calcAccuracy(0, 0)).toBe(100)
  })

  it('calculates accuracy correctly: 45 correct out of 50 = 90%', () => {
    expect(calcAccuracy(45, 50)).toBe(90)
  })

  it('rounds to nearest integer', () => {
    // 45 / 49 * 100 = 91.8... → 92
    expect(calcAccuracy(45, 49)).toBe(92)
  })
})
