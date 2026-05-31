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
  // Still racing AND you haven't finished → typing field. Once you finish (or the
  // room flips to 'done'), show results — so a slow/AFK/disconnected opponent never
  // strands you on the race screen. Standings keep updating live as others finish.
  if (v.phase === 'racing' && !v.you?.finished) {
    return <VersusRace config={v.config} players={v.players} you={v.you}
      onProgress={v.sendProgress} onFinish={(r) => { v.finish(r) }} />
  }
  return <VersusResults config={v.config} players={v.players} you={v.you} onRematch={v.rematch} onLeave={quit} />
}

function Centered({ children }) {
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', position: 'relative', zIndex: 2 }}>{children}</div>
}
