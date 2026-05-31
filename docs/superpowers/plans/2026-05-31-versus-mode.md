# Versus Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-time multiplayer "versus" mode to typo — up to 4 players race the same text in a private room joined by link/code, seeing each opponent's caret advance live.

**Architecture:** App stays a static Vite SPA. Real-time via the **shared my-monkey Supabase** project (`klliwmgdyuatstjvzzbb`). Durable room/roster/result state lives in two tables (`typo_versus_rooms`, `typo_versus_players`) synced with `postgres_changes` (house pattern, cf. `tempo-poc/lib/vs.js`); high-frequency caret positions go over ephemeral **Broadcast** (never persisted). Same text for everyone via a seeded PRNG. Solo modes are untouched.

**Tech Stack:** Vite 6, React 19, `@supabase/supabase-js` ^2.106, vitest, Tailwind v4 (existing design-system classes), lucide-react.

**Spec:** `docs/superpowers/specs/2026-05-31-versus-mode-design.md`

---

## File Structure

**New files**
- `src/lib/rng.js` — seeded PRNG (mulberry32) + `randomSeed()`. Pure.
- `src/lib/textgen.js` — `generateText(mode, lang, rng)` deterministic given an `rng`. Pure. Extracted from `TypingTest.jsx`.
- `src/lib/versus-logic.js` — `generateRoomCode()`, `seedFromString()`, `PLAYER_COLORS`/`colorForIndex()`, `computeStandings()`, `throttle()`. Pure.
- `src/lib/supabase.js` — Supabase client + `versusEnabled`, `getOrCreatePlayerId()`, `getStoredNick()`/`setStoredNick()`.
- `src/useVersus.js` — the one hook that talks to Supabase (rooms/players CRUD, `postgres_changes`, broadcast, start, rematch).
- `src/Versus/Versus.jsx` — container; picks sub-view from room status.
- `src/Versus/VersusLobby.jsx` — room code/link, roster, host controls.
- `src/Versus/VersusRace.jsx` — shared text + own caret + opponent ghost carets + live standings + countdown.
- `src/Versus/VersusResults.jsx` — final standings + rematch/quit.
- `supabase/migrations/0001_typo_versus.sql` — DB schema + RLS + realtime publication (applied to the shared project).
- `.env.example` — documents the two Vite env vars.

**Modified files**
- `src/TypingTest.jsx` — import `generateText` from `lib/textgen.js` (delete the local copy); pass a random rng.
- `src/App.jsx` — read `?v=CODE` on mount; add `'versus'` phase; render `<Versus>`.
- `src/LandingPage.jsx` — add a "Versus" entry that starts a room.
- `package.json` — add `@supabase/supabase-js`.

---

## Task 1: Add dependency, env scaffold, Supabase client

**Files:**
- Modify: `package.json`
- Create: `.env.example`, `.env` (local, gitignored)
- Create: `src/lib/supabase.js`

- [ ] **Step 1: Install the Supabase client**

Run:
```bash
npm install @supabase/supabase-js@^2.106
```
Expected: `package.json` dependencies now include `@supabase/supabase-js`, no errors.

- [ ] **Step 2: Create `.env.example`**

```bash
# Shared my-monkey Supabase project (klliwmgdyuatstjvzzbb). Public keys, baked at build.
VITE_SUPABASE_URL=https://klliwmgdyuatstjvzzbb.supabase.co
VITE_SUPABASE_ANON_KEY=replace-with-the-shared-anon-key
```

- [ ] **Step 3: Create local `.env`** (gitignored — `.gitignore` already ignores nothing env-specific, so confirm)

Run:
```bash
grep -q '^\.env$' .gitignore || printf '\n.env\n.env.local\n' >> .gitignore
```
Then create `.env` with the real values (URL above + the shared anon key from `alloc-warrior/.env` or any sibling using `klliwmgdyuatstjvzzbb`).

- [ ] **Step 4: Create `src/lib/supabase.js`**

Mirrors `alloc-warrior/src/lib/supabase.js` + `tempo-poc/lib/supabase.js`.

```js
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Versus is gracefully disabled if env is missing; solo modes never depend on this.
export const versusEnabled = Boolean(url && anonKey)

if (!versusEnabled) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — versus disabled.')
}

export const supabase = versusEnabled
  ? createClient(url, anonKey, { realtime: { params: { eventsPerSecond: 10 } } })
  : null

const PLAYER_ID_KEY = 'typo_versus_player_id'
const NICK_KEY = 'typo_versus_nick'

export function getOrCreatePlayerId() {
  let id = localStorage.getItem(PLAYER_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(PLAYER_ID_KEY, id)
  }
  return id
}

export function getStoredNick() {
  return localStorage.getItem(NICK_KEY) || ''
}

export function setStoredNick(nick) {
  localStorage.setItem(NICK_KEY, nick)
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build succeeds (the client is created lazily; missing env only logs a warning).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example .gitignore src/lib/supabase.js
git commit -m "feat(versus): add supabase client + env scaffold"
```

---

## Task 2: Database migration on the shared Supabase project

**Files:**
- Create: `supabase/migrations/0001_typo_versus.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- typo versus mode — tables on the SHARED my-monkey project (prefix typo_)
create table if not exists public.typo_versus_rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  config      jsonb not null default '{}'::jsonb,
  status      text not null default 'lobby',   -- lobby | racing | done
  host_id     text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.typo_versus_players (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.typo_versus_rooms(id) on delete cascade,
  player_id    text not null,
  nick         text not null default '',
  color        text not null default '',
  is_host      boolean not null default false,
  finished     boolean not null default false,
  finished_at  timestamptz,
  wpm          integer,
  accuracy     integer,
  joined_at    timestamptz not null default now(),
  unique (room_id, player_id)
);

create index if not exists typo_versus_players_room_idx on public.typo_versus_players (room_id);

-- RLS: anonymous public access, scoped to these two tables only.
alter table public.typo_versus_rooms   enable row level security;
alter table public.typo_versus_players enable row level security;

create policy "typo_versus_rooms anon rw" on public.typo_versus_rooms
  for all to anon, authenticated using (true) with check (true);
create policy "typo_versus_players anon rw" on public.typo_versus_players
  for all to anon, authenticated using (true) with check (true);

-- Realtime: emit full rows on update/delete so filtered postgres_changes work.
alter table public.typo_versus_rooms   replica identity full;
alter table public.typo_versus_players replica identity full;
alter publication supabase_realtime add table public.typo_versus_rooms;
alter publication supabase_realtime add table public.typo_versus_players;
```

- [ ] **Step 2: Apply it to the shared project**

Re-auth the Supabase MCP first (token expires), then apply:
- Preferred: `mcp__supabase__apply_migration` with name `typo_versus` and the SQL above, on project `klliwmgdyuatstjvzzbb`.
- Fallback: paste the SQL in the Supabase dashboard SQL editor for that project.

- [ ] **Step 3: Verify the tables exist**

Run via `mcp__supabase__list_tables` (or dashboard): confirm `typo_versus_rooms` and `typo_versus_players` are present with RLS enabled, and both are in the `supabase_realtime` publication.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_typo_versus.sql
git commit -m "feat(versus): db migration (rooms + players, rls, realtime)"
```

---

## Task 3: Seeded PRNG (`src/lib/rng.js`)

**Files:**
- Create: `src/lib/rng.js`
- Test: `src/lib/rng.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest'
import { mulberry32, randomSeed } from './rng'

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(12345)
    const b = mulberry32(12345)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('returns floats in [0, 1)', () => {
    const r = mulberry32(7)
    for (let i = 0; i < 100; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('different seeds diverge', () => {
    expect(mulberry32(1)()).not.toEqual(mulberry32(2)())
  })

  it('randomSeed returns a 32-bit unsigned integer', () => {
    const s = randomSeed()
    expect(Number.isInteger(s)).toBe(true)
    expect(s).toBeGreaterThanOrEqual(0)
    expect(s).toBeLessThanOrEqual(0xffffffff)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/rng.test.js`
Expected: FAIL — cannot import from `./rng`.

- [ ] **Step 3: Write the implementation**

```js
// Mulberry32: tiny, fast, seedable PRNG. Returns a function -> float in [0, 1).
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomSeed() {
  return Math.floor(Math.random() * 0x100000000) >>> 0
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/rng.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rng.js src/lib/rng.test.js
git commit -m "feat(versus): seeded PRNG (mulberry32)"
```

---

## Task 4: Deterministic text generation (`src/lib/textgen.js`)

Extract `generateText` out of `TypingTest.jsx` and make it take an `rng` (a `() => [0,1)` function) so versus can reproduce the same text from a seed.

**Files:**
- Create: `src/lib/textgen.js`
- Test: `src/lib/textgen.test.js`
- Modify: `src/TypingTest.jsx:11-28` (remove local `generateText`, import the shared one)

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/textgen.test.js`
Expected: FAIL — cannot import from `./textgen`.

- [ ] **Step 3: Write `src/lib/textgen.js`**

```js
import { wordsFr } from './words-fr'
import { wordsEn } from './words-en'
import { quotesFr } from './quotes-fr'
import { quotesEn } from './quotes-en'
import { snippets } from './snippets'
import { getDailyText } from './daily'

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)]

// rng: a function returning a float in [0,1). Pass Math.random for solo (random),
// or a seeded mulberry32 for versus (same text for everyone).
export function generateText(mode, lang, rng = Math.random) {
  if (mode === 'quote') {
    return pick(lang === 'fr' ? quotesFr : quotesEn, rng)
  }
  if (mode === 'code') {
    return pick(snippets, rng)
  }
  if (mode === 'daily') {
    return getDailyText(lang, quotesFr, quotesEn)
  }
  const words = lang === 'fr' ? wordsFr : wordsEn
  const result = []
  for (let i = 0; i < 200; i++) result.push(pick(words, rng))
  return result.join(' ')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/textgen.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Refactor `TypingTest.jsx` to use it**

In `src/TypingTest.jsx`, delete the local `generateText` function (lines ~11-28) and its now-unused data imports, and import the shared one. The top of the file becomes:

```jsx
import { useMemo, useEffect } from 'react'
import { Zap } from 'lucide-react'
import { useTyping } from './useTyping'
import { generateText } from './lib/textgen'
```

The `useMemo` call stays as-is (solo uses the default `Math.random` rng):

```jsx
const text = useMemo(() => generateText(mode, lang), [mode, lang])
```

- [ ] **Step 6: Verify nothing broke**

Run: `npx vitest run && npm run build`
Expected: all tests pass, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/lib/textgen.js src/lib/textgen.test.js src/TypingTest.jsx
git commit -m "feat(versus): extract deterministic generateText into lib/textgen"
```

---

## Task 5: Versus pure logic (`src/lib/versus-logic.js`)

**Files:**
- Create: `src/lib/versus-logic.js`
- Test: `src/lib/versus-logic.test.js`

- [ ] **Step 1: Write the failing test**

```js
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
    expect(fn).toHaveBeenCalledTimes(2)        // trailing flush
    expect(fn).toHaveBeenLastCalledWith('c')
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/versus-logic.test.js`
Expected: FAIL — cannot import from `./versus-logic`.

- [ ] **Step 3: Write the implementation**

```js
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

// Leading + trailing throttle (app code: Date.now is fine here).
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/versus-logic.test.js`
Expected: PASS (all describe blocks).

- [ ] **Step 5: Commit**

```bash
git add src/lib/versus-logic.js src/lib/versus-logic.test.js
git commit -m "feat(versus): pure logic (room code, seed, standings, throttle)"
```

---

## Task 6: Realtime hook (`src/useVersus.js`)

Encapsulates ALL Supabase access. Mirrors `tempo-poc/lib/vs.js` (rooms/players CRUD + `postgres_changes`) plus a `progress` broadcast for live carets. Verified manually in Task 11 (the realtime layer is intentionally thin; pure logic it depends on is already unit-tested).

**Files:**
- Create: `src/useVersus.js`

- [ ] **Step 1: Write the hook**

```jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, versusEnabled, getOrCreatePlayerId, getStoredNick, setStoredNick } from './lib/supabase'
import { generateRoomCode, seedFromString, colorForIndex } from './lib/versus-logic'

const MAX_PLAYERS = 4
const RANDOM_NICKS = ['Renard', 'Lynx', 'Faucon', 'Belette', 'Hibou', 'Loutre']

function defaultNick() {
  const stored = getStoredNick()
  if (stored) return stored
  return RANDOM_NICKS[Math.floor(Math.random() * RANDOM_NICKS.length)]
}

// phase: 'home' | 'connecting' | 'lobby' | 'racing' | 'done' | 'error'
export function useVersus() {
  const playerId = useRef(getOrCreatePlayerId()).current
  const [phase, setPhase] = useState('home')
  const [error, setError] = useState(null)
  const [room, setRoom] = useState(null)        // typo_versus_rooms row
  const [roster, setRoster] = useState([])       // typo_versus_players rows
  const [live, setLive] = useState({})           // playerId -> {pos, errors, wpm}
  const channelRef = useRef(null)

  const config = room?.config || null
  const players = roster.map(p => ({ ...p, live: live[p.player_id] }))
  const you = players.find(p => p.player_id === playerId) || null

  const subscribe = useCallback((roomId) => {
    const channel = supabase.channel(`typo_versus_${roomId}`, { config: { broadcast: { self: false } } })
    channel
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'typo_versus_players', filter: `room_id=eq.${roomId}` },
        () => refreshRoster(roomId))
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'typo_versus_rooms', filter: `id=eq.${roomId}` },
        (payload) => { if (payload.new) setRoom(payload.new) })
      .on('broadcast', { event: 'progress' }, ({ payload }) => {
        setLive(prev => ({ ...prev, [payload.playerId]: payload }))
      })
      .subscribe()
    channelRef.current = channel
  }, [])

  async function refreshRoster(roomId) {
    const { data } = await supabase.from('typo_versus_players')
      .select('*').eq('room_id', roomId).order('joined_at')
    if (data) setRoster(data)
  }

  const createRoom = useCallback(async ({ format, mode, duration, lang }) => {
    if (!versusEnabled) { setError('versus-disabled'); setPhase('error'); return }
    setPhase('connecting')
    try {
      let code
      for (let i = 0; i < 5; i++) {
        code = generateRoomCode()
        const { data } = await supabase.from('typo_versus_rooms').select('id').eq('code', code).maybeSingle()
        if (!data) break
      }
      const textSeed = seedFromString(code)
      const { data: newRoom, error: e1 } = await supabase.from('typo_versus_rooms')
        .insert({ code, host_id: playerId, status: 'lobby', config: { format, mode, duration, lang, textSeed } })
        .select().single()
      if (e1) throw e1
      await supabase.from('typo_versus_players').insert({
        room_id: newRoom.id, player_id: playerId, nick: defaultNick(), color: colorForIndex(0), is_host: true,
      })
      setRoom(newRoom)
      subscribe(newRoom.id)
      await refreshRoster(newRoom.id)
      setPhase('lobby')
    } catch (e) { setError(String(e.message || e)); setPhase('error') }
  }, [playerId, subscribe])

  const joinRoom = useCallback(async (rawCode) => {
    if (!versusEnabled) { setError('versus-disabled'); setPhase('error'); return }
    setPhase('connecting')
    try {
      const code = rawCode.toUpperCase().trim()
      const { data: target } = await supabase.from('typo_versus_rooms').select('*').eq('code', code).maybeSingle()
      if (!target) { setError('room-not-found'); setPhase('error'); return }
      const { data: existing } = await supabase.from('typo_versus_players')
        .select('*').eq('room_id', target.id).order('joined_at')
      const already = existing?.find(p => p.player_id === playerId)
      if (!already) {
        if ((existing?.length || 0) >= MAX_PLAYERS) { setError('room-full'); setPhase('error'); return }
        if (target.status !== 'lobby') { setError('room-in-progress'); setPhase('error'); return }
        await supabase.from('typo_versus_players').insert({
          room_id: target.id, player_id: playerId, nick: defaultNick(), color: colorForIndex(existing?.length || 0),
        })
      }
      setRoom(target)
      subscribe(target.id)
      await refreshRoster(target.id)
      setPhase(target.status === 'lobby' ? 'lobby' : target.status)
    } catch (e) { setError(String(e.message || e)); setPhase('error') }
  }, [playerId, subscribe])

  const setNick = useCallback(async (nick) => {
    setStoredNick(nick)
    if (room) await supabase.from('typo_versus_players').update({ nick }).eq('room_id', room.id).eq('player_id', playerId)
  }, [room, playerId])

  const start = useCallback(async () => {
    if (!room) return
    const textSeed = seedFromString(room.code + ':' + Date.now()) // fresh text each race
    await supabase.from('typo_versus_players')
      .update({ finished: false, finished_at: null, wpm: null, accuracy: null }).eq('room_id', room.id)
    await supabase.from('typo_versus_rooms')
      .update({ status: 'racing', config: { ...room.config, textSeed } }).eq('id', room.id)
  }, [room])

  const rematch = useCallback(async () => {
    if (!room) return
    setLive({})
    await supabase.from('typo_versus_rooms').update({ status: 'lobby' }).eq('id', room.id)
  }, [room])

  const finish = useCallback(async ({ wpm, accuracy }) => {
    if (!room) return
    await supabase.from('typo_versus_players')
      .update({ finished: true, finished_at: new Date().toISOString(), wpm, accuracy })
      .eq('room_id', room.id).eq('player_id', playerId)
  }, [room, playerId])

  const sendProgress = useCallback((state) => {
    channelRef.current?.send({ type: 'broadcast', event: 'progress', payload: { playerId, ...state } })
  }, [playerId])

  const leave = useCallback(async () => {
    if (room) await supabase.from('typo_versus_players').delete().eq('room_id', room.id).eq('player_id', playerId)
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = null
    setRoom(null); setRoster([]); setLive({}); setPhase('home'); setError(null)
  }, [room, playerId])

  // Keep phase in sync with room.status (lobby/racing/done driven by postgres_changes).
  useEffect(() => {
    if (room && ['lobby', 'racing', 'done'].includes(room.status)) setPhase(room.status)
  }, [room?.status])

  useEffect(() => () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }, [])

  return { phase, error, room, config, players, you, playerId, MAX_PLAYERS,
           createRoom, joinRoom, setNick, start, rematch, finish, sendProgress, leave }
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: build succeeds (no type/import errors).

- [ ] **Step 3: Commit**

```bash
git add src/useVersus.js
git commit -m "feat(versus): realtime hook (rooms/players, postgres_changes, broadcast)"
```

---

## Task 7: Lobby UI (`src/Versus/VersusLobby.jsx`)

**Files:**
- Create: `src/Versus/VersusLobby.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { useState } from 'react'
import { Copy, Crown, Play, ArrowLeft } from 'lucide-react'

const T = {
  fr: { title: 'Salle versus', share: 'Partage ce lien', copy: 'Copier', copied: 'Copié',
        players: 'Joueurs', you: 'toi', host: 'hôte', start: 'Lancer la course',
        waiting: "En attente de l'hôte…", nick: 'Ton pseudo', leave: 'Quitter', alone: 'En attente de joueurs…' },
  en: { title: 'Versus room', share: 'Share this link', copy: 'Copy', copied: 'Copied',
        players: 'Players', you: 'you', host: 'host', start: 'Start race',
        waiting: 'Waiting for host…', nick: 'Your nickname', leave: 'Leave', alone: 'Waiting for players…' },
}

export function VersusLobby({ room, players, you, config, onStart, onSetNick, onLeave }) {
  const t = T[config?.lang || 'fr']
  const [copied, setCopied] = useState(false)
  const link = `${location.origin}/?v=${room.code}`
  const isHost = you?.is_host

  function copyLink() {
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }

  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative', zIndex: 2 }}>
      <button className="btn btn-ghost" onClick={onLeave} style={{ alignSelf: 'flex-start' }}>
        <ArrowLeft size={16} /> {t.leave}
      </button>

      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{t.title}</h1>
        <div className="mono" style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--accent)', marginTop: '0.5rem' }}>
          {room.code}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input readOnly value={link} className="mono" style={{
          flex: 1, padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          background: 'var(--bg-subtle)', color: 'var(--text-dim)', fontSize: '0.82rem',
        }} />
        <button className="btn btn-soft" onClick={copyLink}><Copy size={15} /> {copied ? t.copied : t.copy}</button>
      </div>

      <div>
        <div style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
          {t.players} ({players.length}/4)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {players.map(p => (
            <div key={p.player_id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
              <span style={{ fontWeight: 600 }}>{p.nick}</span>
              {p.is_host && <Crown size={13} style={{ color: 'var(--accent)' }} />}
              {p.player_id === you?.player_id && <span style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>({t.you})</span>}
            </div>
          ))}
        </div>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
        {t.nick}
        <input defaultValue={you?.nick || ''} onBlur={e => onSetNick(e.target.value.slice(0, 16))} maxLength={16}
          style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text)', fontSize: '0.95rem', textTransform: 'none', letterSpacing: 'normal' }} />
      </label>

      {isHost ? (
        <button className="btn btn-primary" onClick={onStart} disabled={players.length < 2}
          style={{ opacity: players.length < 2 ? 0.5 : 1 }}>
          <Play size={16} /> {players.length < 2 ? t.alone : t.start}
        </button>
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.9rem' }}>{t.waiting}</div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/Versus/VersusLobby.jsx
git commit -m "feat(versus): lobby UI"
```

---

## Task 8: Race UI (`src/Versus/VersusRace.jsx`)

Renders the shared text once with the local caret + opponent ghost carets, a live standings strip, and a 3·2·1 countdown. Reuses `useTyping`. The inner `<RaceField>` mounts only after the countdown so keyboard input begins at go.

**Files:**
- Create: `src/Versus/VersusRace.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { useState, useEffect, useRef, useMemo } from 'react'
import { useTyping } from '../useTyping'
import { generateText } from '../lib/textgen'
import { mulberry32 } from '../lib/rng'
import { computeStandings, throttle } from '../lib/versus-logic'

export function VersusRace({ config, players, you, onProgress, onFinish }) {
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (countdown <= 0) return
    const id = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown])

  if (countdown > 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', position: 'relative', zIndex: 2 }}>
        <div className="mono tnum" style={{ fontSize: '7rem', fontWeight: 700, color: 'var(--accent)' }}>{countdown}</div>
      </div>
    )
  }
  return <RaceField config={config} players={players} you={you} onProgress={onProgress} onFinish={onFinish} />
}

function RaceField({ config, players, you, onProgress, onFinish }) {
  const text = useMemo(
    () => generateText(config.mode, config.lang, mulberry32(config.textSeed)),
    [config.mode, config.lang, config.textSeed]
  )
  const { charStates, position, wpm, accuracy, done, remaining } =
    useTyping(text, config.format === 'timed' ? config.duration : null)

  // throttle progress broadcasts (~10/s)
  const send = useRef(throttle((s) => onProgress(s), 100)).current
  useEffect(() => { send({ pos: position, errors: charStates.filter(c => c.status === 'error').length, wpm }) },
    [position, wpm]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (done) onFinish({ wpm, accuracy }) }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  // opponent caret positions (exclude self), keyed by char index for quick lookup
  const ghosts = useMemo(() => {
    const map = {}
    for (const p of players) {
      if (p.player_id === you?.player_id) continue
      const pos = p.live?.pos ?? 0
      ;(map[pos] ||= []).push(p.color)
    }
    return map
  }, [players, you])

  const standings = computeStandings(players, config.format)
  const progressPct = (p) => Math.round(((p.player_id === you?.player_id ? position : (p.live?.pos ?? 0)) / text.length) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', gap: '2rem', padding: '2rem', position: 'relative', zIndex: 2 }}>
      {/* standings strip */}
      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 720, width: '100%' }}>
        {standings.map((p, i) => (
          <div key={p.player_id} className="mono tnum" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', opacity: p.finished ? 0.6 : 1 }}>
            <span style={{ color: 'var(--text-faint)' }}>{i + 1}.</span>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: p.player_id === you?.player_id ? 'var(--accent)' : p.color }} />
            <span style={{ fontWeight: 600, color: p.player_id === you?.player_id ? 'var(--accent)' : 'var(--text)' }}>{p.nick}</span>
            <span style={{ color: 'var(--text-dim)' }}>{p.finished ? `${p.wpm} WPM` : `${progressPct(p)}%`}</span>
          </div>
        ))}
      </div>

      {config.format === 'timed' && (
        <div className="mono tnum" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>{remaining}s</div>
      )}

      {/* shared text with own caret + opponent ghost carets */}
      <div className="mono" style={{ maxWidth: 720, width: '100%', fontSize: '1.4rem', lineHeight: '2.2rem', letterSpacing: '0.01em', userSelect: 'none', color: 'var(--text-faint)' }}>
        {charStates.map((cs, i) => {
          const isCursor = i === position
          const ghostColors = ghosts[i]
          return (
            <span key={i}
              className={isCursor ? 'cursor' : ''}
              style={{
                color: cs.status === 'correct' ? 'var(--correct)' : cs.status === 'error' ? 'var(--error)' : 'var(--text-faint)',
                borderRight: ghostColors ? `2px solid ${ghostColors[0]}` : undefined,
              }}>
              {cs.char}
            </span>
          )
        })}
      </div>

      <div className="mono tnum" style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
        {wpm > 0 ? `${wpm} WPM · ${accuracy}%` : ''}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/Versus/VersusRace.jsx
git commit -m "feat(versus): race UI (shared text, ghost carets, standings, countdown)"
```

---

## Task 9: Results UI (`src/Versus/VersusResults.jsx`)

**Files:**
- Create: `src/Versus/VersusResults.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { Trophy, RotateCcw, LogOut } from 'lucide-react'
import { computeStandings } from '../lib/versus-logic'

const T = {
  fr: { title: 'Résultats', rematch: 'Rejouer', leave: 'Quitter', waiting: "En attente de l'hôte…", dnf: 'abandon' },
  en: { title: 'Results', rematch: 'Rematch', leave: 'Leave', waiting: 'Waiting for host…', dnf: 'DNF' },
}

export function VersusResults({ config, players, you, onRematch, onLeave }) {
  const t = T[config?.lang || 'fr']
  const standings = computeStandings(players, config.format)
  const isHost = you?.is_host

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', gap: '2rem', padding: '2rem', position: 'relative', zIndex: 2 }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{t.title}</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%', maxWidth: 420 }}>
        {standings.map((p, i) => (
          <div key={p.player_id} style={{
            display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.8rem 1rem',
            border: `1px solid ${i === 0 ? 'color-mix(in srgb, var(--accent) 55%, transparent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)', background: i === 0 ? 'var(--accent-soft)' : 'var(--surface)',
          }}>
            <span className="mono tnum" style={{ color: 'var(--text-faint)', width: '1.5rem' }}>{i + 1}</span>
            {i === 0 && <Trophy size={15} style={{ color: 'var(--accent)' }} />}
            <span style={{ width: 10, height: 10, borderRadius: 3, background: p.player_id === you?.player_id ? 'var(--accent)' : p.color }} />
            <span style={{ fontWeight: 600, flex: 1 }}>{p.nick}</span>
            <span className="mono tnum" style={{ color: 'var(--text-dim)' }}>
              {p.finished ? `${p.wpm} WPM · ${p.accuracy}%` : t.dnf}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {isHost && <button className="btn btn-soft" onClick={onRematch}><RotateCcw size={15} /> {t.rematch}</button>}
        <button className="btn btn-ghost" onClick={onLeave}><LogOut size={15} /> {t.leave}</button>
      </div>
      {!isHost && <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{t.waiting}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/Versus/VersusResults.jsx
git commit -m "feat(versus): results UI"
```

---

## Task 10: Container + wire into App & Landing

**Files:**
- Create: `src/Versus/Versus.jsx`
- Modify: `src/App.jsx`
- Modify: `src/LandingPage.jsx`

- [ ] **Step 1: Write the container `src/Versus/Versus.jsx`**

```jsx
import { useEffect, useRef } from 'react'
import { useVersus } from '../useVersus'
import { VersusLobby } from './VersusLobby'
import { VersusRace } from './VersusRace'
import { VersusResults } from './VersusResults'

const ERR = {
  fr: { 'room-not-found': 'Salle introuvable.', 'room-full': 'Salle pleine (4 max).',
        'room-in-progress': 'Course déjà en cours, attends la prochaine.', 'versus-disabled': 'Versus indisponible.' },
  en: { 'room-not-found': 'Room not found.', 'room-full': 'Room full (max 4).',
        'room-in-progress': 'A race is already running, wait for the next one.', 'versus-disabled': 'Versus unavailable.' },
}

// initialCode: join an existing room (from ?v=CODE). createConfig: create a new room.
export function Versus({ initialCode, createConfig, lang, onExit }) {
  const v = useVersus()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (initialCode) v.joinRoom(initialCode)
    else if (createConfig) v.createRoom(createConfig)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function quit() { v.leave(); onExit() }

  if (v.phase === 'connecting' || v.phase === 'home') {
    return <Centered>…</Centered>
  }
  if (v.phase === 'error') {
    const msg = ERR[lang || 'fr'][v.error] || v.error
    return <Centered>
      <div style={{ color: 'var(--error)' }}>{msg}</div>
      <button className="btn btn-ghost" onClick={quit} style={{ marginTop: '1rem' }}>← {lang === 'en' ? 'Back' : 'Retour'}</button>
    </Centered>
  }
  if (v.phase === 'lobby') {
    return <VersusLobby room={v.room} players={v.players} you={v.you} config={v.config}
      onStart={v.start} onSetNick={v.setNick} onLeave={quit} />
  }
  if (v.phase === 'racing') {
    return <VersusRace config={v.config} players={v.players} you={v.you}
      onProgress={v.sendProgress} onFinish={(r) => { v.finish(r) }} />
  }
  // 'done' is set when the host flips status; results are derived from players rows
  return <VersusResults config={v.config} players={v.players} you={v.you} onRematch={v.rematch} onLeave={quit} />
}

function Centered({ children }) {
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', position: 'relative', zIndex: 2 }}>{children}</div>
}
```

Note on `done`: when every active player has `finished`, the host calls `v.rematch` to return to lobby, or a player leaves. For v1, the race view itself shows final standings once `done`; transition to `done` happens by the host pressing rematch is NOT it — instead, set the room to `done` when all finished. Add this to `useVersus.finish` follow-up:

In `src/useVersus.js`, after a successful `finish(...)`, the host (only) checks whether everyone finished and flips the room:
```jsx
// inside finish(), after the update succeeds:
if (you?.is_host) {
  const { data } = await supabase.from('typo_versus_players').select('finished').eq('room_id', room.id)
  if (data && data.every(p => p.finished)) {
    await supabase.from('typo_versus_rooms').update({ status: 'done' }).eq('id', room.id)
  }
}
```
(For `timed`, every client finishes at the time limit, so the same check flips to `done`.)

- [ ] **Step 2: Add the host "all finished → done" check to `useVersus.finish`**

Apply the snippet above inside the `finish` callback in `src/useVersus.js` (after the player-row update). `you` is available in the hook scope.

- [ ] **Step 3: Wire `App.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { LandingPage } from './LandingPage'
import { TypingTest } from './TypingTest'
import { Results } from './Results'
import { Versus } from './Versus/Versus'

export default function App() {
  const [phase, setPhase] = useState('selector')
  const [config, setConfig] = useState(null)
  const [results, setResults] = useState(null)
  const [testKey, setTestKey] = useState(0)
  const [versus, setVersus] = useState(null) // { initialCode } | { createConfig, lang }

  useEffect(() => {
    if (config?.lang) document.documentElement.lang = config.lang
  }, [config?.lang])

  // Deep link: /?v=CODE → jump straight into that room.
  useEffect(() => {
    const code = new URLSearchParams(location.search).get('v')
    if (code) { setVersus({ initialCode: code, lang: localStorage.getItem('typo_lang') || 'fr' }); setPhase('versus') }
  }, [])

  function handleStart(cfg) { setConfig(cfg); setPhase('test') }
  function handleFinish(res) { setResults(res); setPhase('results') }
  function handleRestart() { setTestKey(k => k + 1); setPhase('test') }
  function handleBack() { setPhase('selector') }
  function handleVersus(cfg) { setVersus({ createConfig: cfg, lang: cfg.lang }); setPhase('versus') }
  function exitVersus() {
    history.replaceState(null, '', location.pathname) // drop ?v=
    setVersus(null); setPhase('selector')
  }

  return (
    <div style={{ minHeight: '100dvh' }}>
      {phase === 'selector' && <LandingPage onStart={handleStart} onVersus={handleVersus} />}
      {phase === 'test' && config && (
        <TypingTest key={testKey} config={config} onFinish={handleFinish} onRestart={handleRestart} />
      )}
      {phase === 'results' && results && config && (
        <Results results={results} config={config} onRestart={handleRestart} onBack={handleBack} />
      )}
      {phase === 'versus' && versus && (
        <Versus initialCode={versus.initialCode} createConfig={versus.createConfig} lang={versus.lang} onExit={exitVersus} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add a "Versus" entry to `LandingPage.jsx`**

Add `onVersus` to the props and a button under the existing Start CTA. Add to the `content` object: `fr.versus = 'Jouer en versus'`, `en.versus = 'Play versus'`. Then in the test-config panel, just after the primary Start button:

```jsx
<button
  className="btn btn-ghost"
  onClick={() => onVersus({ format: mode === 'duration' ? 'timed' : 'race', mode, duration: mode === 'duration' ? duration : null, lang, targetWPM })}
  style={{ marginTop: '0.25rem' }}
>
  {t.versus}
</button>
```
(Format is derived from the chosen solo mode: `duration` → `timed`, anything else → `race`. The host can still see/confirm in the lobby in a later iteration.)

- [ ] **Step 5: Verify build + tests**

Run: `npx vitest run && npm run build`
Expected: all tests pass, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/Versus/Versus.jsx src/useVersus.js src/App.jsx src/LandingPage.jsx
git commit -m "feat(versus): container + app routing + landing entry"
```

---

## Task 11: End-to-end verification (two browser windows)

**Files:** none (manual / Playwright).

- [ ] **Step 1: Start dev server with env loaded**

Run: `npm run dev` (ensure `.env` has the real shared anon key).

- [ ] **Step 2: 1v1 happy path (two windows / profiles)**

- Window A: landing → "Jouer en versus" → lobby shows a code + link.
- Window B: open `http://localhost:5173/?v=<CODE>` → appears in A's roster within ~1s (postgres_changes).
- A (host) clicks "Lancer" → both see 3·2·1 → race.
- Type in both → each sees the **other's ghost caret advance** on the shared text and the standings reorder live.
- Finish both → both land on Results with the same final ranking; winner highlighted.
- A clicks "Rejouer" → both return to lobby; "Lancer" starts a fresh (different) text.

Expected: roster, carets, standings, results, rematch all behave. No console errors except the React devtools info line.

- [ ] **Step 3: Edge cases**

- 4 players: open four windows on the same code; confirm 5th gets "Salle pleine".
- Join mid-race: open `?v=CODE` while A is racing → "Course déjà en cours".
- Disconnect: close a non-host window mid-race → others keep racing; that player shows as DNF at results.
- No env: temporarily rename `.env`, reload → "Versus indisponible", solo modes still work.

- [ ] **Step 4: Optional Playwright capture**

Drive two pages with `mcp__plugin_playwright_playwright__*` (as used during the redesign) to script-type in both and screenshot the race + results for the record.

- [ ] **Step 5: Commit any fixes found**

```bash
git add -A
git commit -m "fix(versus): address issues found in e2e verification"
```

---

## Task 12: Ship

**Files:** none (build + release).

- [ ] **Step 1: Ensure build-time env**

The release build must be produced with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set (in `.env`, which Vite reads at build). Confirm `dist/assets/*.js` contains the project URL after `npm run build`.

- [ ] **Step 2: Update `.monkey` site description** (mentions versus) — optional, one line.

- [ ] **Step 3: Merge `feat/versus-mode` → master, tarball, GitHub release** following the project's deploy recipe (`v2026.MM.DD.N`), then poll the monkey admin API for `status: success` and verify the live site.

---

## Self-Review

- **Spec coverage:** connection by link/code (Task 7 lobby + Task 10 `?v=`), ≤4 players (`MAX_PLAYERS`, Task 6), shared-text + ghost carets + standings (Task 8), host-chosen format race/timed (config in Task 6/10, standings in Task 5), Supabase Realtime via shared project + `postgres_changes` + broadcast (Tasks 1/2/6), auto-editable nick + color (Task 6/7), rematch (Task 6/9), `?v=CODE` (Task 10), disconnect/full/in-progress edges (Task 6 + Task 11), graceful disable without env (Task 1/10), seeded determinism (Tasks 3/4). All covered.
- **Placeholders:** none — every code step contains complete code; the one prose note (`done` transition) is resolved into concrete code in Task 10 Steps 1–2.
- **Type consistency:** `players[].live = {pos, errors, wpm}` is produced in `useVersus` (broadcast handler) and consumed identically in `versus-logic.computeStandings` and `VersusRace`. `config = {format, mode, duration, lang, textSeed}` is consistent across migration, hook, race, results. `generateText(mode, lang, rng)` signature matches in `textgen`, `TypingTest`, and `VersusRace`. `finish({wpm, accuracy})` matches between `Versus` and `useVersus`.
