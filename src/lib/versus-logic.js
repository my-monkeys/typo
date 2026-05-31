export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I

export function generateRoomCode() {
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)]
  }
  return code
}

// Stable 32-bit hash (djb2-ish) so a room's text seed derives from its code.
export function seedFromString(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0
  return h >>> 0
}

export const PLAYER_COLORS = ['#d9a441', '#5ba3c2', '#cf6f4e', '#7faa4f', '#b07fc2']

export function colorForIndex(i) {
  return PLAYER_COLORS[i % PLAYER_COLORS.length]
}

// live = latest broadcast {pos, wpm} for the player (may be undefined before first tick).
function liveOf(p) {
  return p.live || { pos: 0, wpm: 0 }
}

export function computeStandings(players, format) {
  const arr = [...players]
  if (format === 'timed') {
    return arr.sort((a, b) => {
      const wa = a.finished ? (a.wpm ?? 0) : liveOf(a).wpm
      const wb = b.finished ? (b.wpm ?? 0) : liveOf(b).wpm
      return wb - wa
    })
  }
  // race: finishers first (by finished_at asc), then unfinished by live pos desc
  return arr.sort((a, b) => {
    if (a.finished && b.finished) return new Date(a.finished_at) - new Date(b.finished_at)
    if (a.finished) return -1
    if (b.finished) return 1
    return liveOf(b).pos - liveOf(a).pos
  })
}

// Leading + trailing throttle.
export function throttle(fn, ms) {
  let last = 0
  let timer = null
  let lastArgs = null
  return function (...args) {
    const now = Date.now()
    lastArgs = args
    if (now - last >= ms) {
      last = now
      fn(...args)
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now()
        timer = null
        fn(...lastArgs)
      }, ms - (now - last))
    }
  }
}
