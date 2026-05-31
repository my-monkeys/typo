import { useState } from 'react'
import { Copy, Crown, Play, ArrowLeft, Pencil, Check } from 'lucide-react'

const T = {
  fr: { title: 'Salle versus', share: 'Partage ce lien', copy: 'Copier', copied: 'Copié',
        players: 'Joueurs', you: 'toi', host: 'hôte', start: 'Lancer la course',
        waiting: "En attente de l'hôte…", edit: 'Modifier le pseudo', save: 'Enregistrer', leave: 'Quitter', alone: 'En attente de joueurs…' },
  en: { title: 'Versus room', share: 'Share this link', copy: 'Copy', copied: 'Copied',
        players: 'Players', you: 'you', host: 'host', start: 'Start race',
        waiting: 'Waiting for host…', edit: 'Edit nickname', save: 'Save', leave: 'Leave', alone: 'Waiting for players…' },
}

export function VersusLobby({ room, players, you, config, onStart, onSetNick, onLeave }) {
  const t = T[config?.lang || 'fr']
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const link = `${location.origin}/?v=${room.code}`
  const isHost = you?.is_host

  function copyLink() {
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }

  function startEdit(currentNick) {
    setDraft(currentNick || '')
    setEditing(true)
  }

  function saveEdit() {
    const next = draft.trim().slice(0, 16)
    if (next) onSetNick(next)
    setEditing(false)
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
          {players.map(p => {
            const isYou = p.player_id === you?.player_id
            return (
              <div key={p.player_id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />

                {isYou && editing ? (
                  <input
                    autoFocus
                    value={draft}
                    maxLength={16}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false) }}
                    style={{ flex: 1, minWidth: 0, padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--bg-subtle)', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 600 }}
                  />
                ) : (
                  <span style={{ fontWeight: 600 }}>{p.nick}</span>
                )}

                {p.is_host && <Crown size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                {isYou && !editing && <span style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>({t.you})</span>}

                {isYou && (
                  <button
                    className="icon-btn"
                    onClick={() => (editing ? saveEdit() : startEdit(p.nick))}
                    aria-label={editing ? t.save : t.edit}
                    title={editing ? t.save : t.edit}
                    style={{ marginLeft: 'auto', flexShrink: 0, color: editing ? 'var(--accent)' : 'var(--text-dim)' }}
                  >
                    {editing ? <Check size={15} /> : <Pencil size={14} />}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

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
