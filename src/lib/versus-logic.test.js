import { describe, it, expect, vi } from 'vitest'
import {
  generateRoomCode, ROOM_CODE_ALPHABET, seedFromString,
  colorForIndex, PLAYER_COLORS, computeStandings, throttle,
} from './versus-logic'

describe('generateRoomCode', () => {
  it('is 5 chars from the unambiguous alphabet', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode()
      expect(code).toHaveLength(5)
      for (const ch of code) expect(ROOM_CODE_ALPHABET).toContain(ch)
    }
  })
})

describe('seedFromString', () => {
  it('is deterministic and unsigned-32-bit', () => {
    expect(seedFromString('ABCDE')).toBe(seedFromString('ABCDE'))
    expect(seedFromString('ABCDE')).not.toBe(seedFromString('ABCDF'))
    expect(seedFromString('xyz')).toBeGreaterThanOrEqual(0)
  })
})

describe('colorForIndex', () => {
  it('cycles through the palette', () => {
    expect(colorForIndex(0)).toBe(PLAYER_COLORS[0])
    expect(colorForIndex(PLAYER_COLORS.length)).toBe(PLAYER_COLORS[0])
  })
})

describe('computeStandings', () => {
  const base = (over) => ({ player_id: 'x', nick: 'X', finished: false, finished_at: null, wpm: 0, live: { pos: 0, wpm: 0 }, ...over })

  it('race: finishers first by finished_at, then by live pos', () => {
    const players = [
      base({ player_id: 'a', finished: true, finished_at: '2026-01-01T00:00:02Z', wpm: 80 }),
      base({ player_id: 'b', finished: true, finished_at: '2026-01-01T00:00:01Z', wpm: 90 }),
      base({ player_id: 'c', finished: false, live: { pos: 40, wpm: 50 } }),
      base({ player_id: 'd', finished: false, live: { pos: 10, wpm: 30 } }),
    ]
    const order = computeStandings(players, 'race').map(p => p.player_id)
    expect(order).toEqual(['b', 'a', 'c', 'd'])
  })

  it('timed: ranked by wpm desc (final if finished, else live)', () => {
    const players = [
      base({ player_id: 'a', finished: true, wpm: 70 }),
      base({ player_id: 'b', finished: false, live: { pos: 5, wpm: 95 } }),
      base({ player_id: 'c', finished: true, wpm: 80 }),
    ]
    const order = computeStandings(players, 'timed').map(p => p.player_id)
    expect(order).toEqual(['b', 'c', 'a'])
  })
})

describe('throttle', () => {
  it('calls leading immediately then at most once per window', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const t = throttle(fn, 100)
    t('a'); t('b'); t('c')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenLastCalledWith('a')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('c')
    vi.useRealTimers()
  })
})
