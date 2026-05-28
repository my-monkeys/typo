import { useEffect, useState } from 'react'
import { RotateCcw, ChevronLeft } from 'lucide-react'
import { bestKey, getBest, setBest } from './lib/storage'

export function Results({ results, config, onRestart, onBack }) {
  const { wpm, accuracy } = results
  const { mode, duration, lang } = config
  const key = bestKey(mode, duration, lang)
  const [isRecord, setIsRecord] = useState(false)
  const [best, setBestState] = useState(() => getBest(key))

  useEffect(() => {
    const prev = getBest(key)
    if (prev === null || wpm > prev) {
      setBest(key, wpm)
      setBestState(wpm)
      if (prev !== null) setIsRecord(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const labels = {
    fr: { wpmLabel: 'mots / min', accuracy: 'précision', best: 'meilleur', record: 'Nouveau record !', restart: 'Recommencer', back: 'Changer de mode' },
    en: { wpmLabel: 'words / min', accuracy: 'accuracy', best: 'best', record: 'New record!', restart: 'Restart', back: 'Change mode' },
  }
  const t = labels[lang]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '2.5rem' }}>
      {/* WPM */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '5rem', fontWeight: '800', color: 'var(--accent)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {wpm}
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem', letterSpacing: '0.1em', marginTop: '0.25rem' }}>
          {t.wpmLabel}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '3rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: '600', color: 'var(--text)' }}>{accuracy}%</div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', letterSpacing: '0.08em' }}>{t.accuracy}</div>
        </div>
        {best !== null && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: '600', color: 'var(--text)' }}>{best}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', letterSpacing: '0.08em' }}>{t.best}</div>
          </div>
        )}
      </div>

      {/* Record badge */}
      {isRecord && (
        <div style={{ color: 'var(--accent)', fontSize: '0.875rem', letterSpacing: '0.1em', border: '1px solid var(--accent)', borderRadius: '2rem', padding: '0.3rem 1rem', background: 'rgba(226,203,149,0.08)' }}>
          {t.record}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.6rem 1.25rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          <ChevronLeft size={15} />
          {t.back}
        </button>
        <button
          onClick={onRestart}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.6rem 1.5rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--accent)',
            background: 'rgba(226,203,149,0.1)',
            color: 'var(--accent)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600',
          }}
        >
          <RotateCcw size={15} />
          {t.restart}
        </button>
      </div>
    </div>
  )
}
