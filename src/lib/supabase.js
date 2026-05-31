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
