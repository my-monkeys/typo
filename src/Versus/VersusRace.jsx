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
