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

  async function refreshRoster(roomId) {
    const { data } = await supabase.from('typo_versus_players')
      .select('*').eq('room_id', roomId).order('joined_at')
    if (data) setRoster(data)
  }

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
    // Host flips the room to 'done' once everyone has finished.
    if (you?.is_host) {
      const { data } = await supabase.from('typo_versus_players').select('finished').eq('room_id', room.id)
      if (data && data.every(p => p.finished)) {
        await supabase.from('typo_versus_rooms').update({ status: 'done' }).eq('id', room.id)
      }
    }
  }, [room, playerId, you])

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
