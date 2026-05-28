import { useState } from 'react'
import { Timer, Quote } from 'lucide-react'

const DURATIONS = [15, 30, 60]

export function ModeSelector({ onStart }) {
  const [lang, setLang] = useState(() => localStorage.getItem('typo_lang') || 'fr')
  const [mode, setMode] = useState('duration')
  const [duration, setDuration] = useState(30)

  function handleLang(l) {
    setLang(l)
    localStorage.setItem('typo_lang', l)
  }

  function handleStart() {
    onStart({ mode, duration: mode === 'duration' ? duration : null, lang })
  }

  const labels = {
    fr: { duration: 'Durée', quote: 'Citation', start: 'Commencer', langLabel: 'Langue' },
    en: { duration: 'Timed', quote: 'Quote', start: 'Start', langLabel: 'Language' },
  }
  const t = labels[lang]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '2.5rem' }}>
      <h1 style={{ fontSize: '1.25rem', letterSpacing: '0.15em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
        my-monkey / typo
      </h1>

      {/* Language */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {['fr', 'en'].map(l => (
          <button
            key={l}
            onClick={() => handleLang(l)}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid',
              borderColor: lang === l ? 'var(--accent)' : 'var(--border)',
              background: lang === l ? 'rgba(226,203,149,0.08)' : 'transparent',
              color: lang === l ? 'var(--accent)' : 'var(--text-dim)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Mode */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {[['duration', t.duration, Timer], ['quote', t.quote, Quote]].map(([m, label, Icon]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '0.5rem',
              border: '1px solid',
              borderColor: mode === m ? 'var(--accent)' : 'var(--border)',
              background: mode === m ? 'rgba(226,203,149,0.08)' : 'var(--surface)',
              color: mode === m ? 'var(--accent)' : 'var(--text-dim)',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Duration picker (only in duration mode) */}
      {mode === 'duration' && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {DURATIONS.map(d => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              style={{
                width: '3.5rem', height: '3.5rem',
                borderRadius: '0.5rem',
                border: '1px solid',
                borderColor: duration === d ? 'var(--accent)' : 'var(--border)',
                background: duration === d ? 'rgba(226,203,149,0.08)' : 'var(--surface)',
                color: duration === d ? 'var(--accent)' : 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
              }}
            >
              {d}s
            </button>
          ))}
        </div>
      )}

      {/* Start */}
      <button
        onClick={handleStart}
        style={{
          padding: '0.75rem 2.5rem',
          borderRadius: '0.5rem',
          border: '1px solid var(--accent)',
          background: 'rgba(226,203,149,0.1)',
          color: 'var(--accent)',
          cursor: 'pointer',
          fontSize: '1rem',
          fontWeight: '600',
          letterSpacing: '0.08em',
        }}
      >
        {t.start}
      </button>
    </div>
  )
}
