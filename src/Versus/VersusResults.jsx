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
