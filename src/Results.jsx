import { useEffect, useState } from 'react'
import { RotateCcw, ChevronLeft, Trophy } from 'lucide-react'
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
    fr: { wpmLabel: 'mots / minute', accuracy: 'précision', best: 'record', record: 'Nouveau record', restart: 'Recommencer', back: 'Changer de mode' },
    en: { wpmLabel: 'words / minute', accuracy: 'accuracy', best: 'best', record: 'New record', restart: 'Restart', back: 'Change mode' },
  }
  const t = labels[lang]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', gap: '2.5rem', padding: '2rem', position: 'relative', zIndex: 2 }}>

      {/* WPM */}
      <div style={{ textAlign: 'center' }}>
        <div className="mono tnum" style={{ fontSize: 'clamp(4.5rem, 16vw, 6.5rem)', fontWeight: 700, color: 'var(--accent)', lineHeight: 0.95, letterSpacing: '-0.04em' }}>
          {wpm}
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '0.5rem' }}>
          {t.wpmLabel}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '3.5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="mono tnum" style={{ fontSize: '1.75rem', fontWeight: 600 }}>{accuracy}%</div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '0.25rem' }}>{t.accuracy}</div>
        </div>
        {best !== null && (
          <div style={{ textAlign: 'center' }}>
            <div className="mono tnum" style={{ fontSize: '1.75rem', fontWeight: 600 }}>{best}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '0.25rem' }}>{t.best}</div>
          </div>
        )}
      </div>

      {/* Record badge — squared flag, not a pill */}
      {isRecord && (
        <div className="mono" style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          border: '1px solid color-mix(in srgb, var(--accent) 55%, transparent)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.45rem 0.9rem',
          background: 'var(--accent-soft)',
        }}>
          <Trophy size={14} />
          {t.record}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        <button onClick={onBack} className="btn btn-ghost">
          <ChevronLeft size={16} />
          {t.back}
        </button>
        <button onClick={onRestart} className="btn btn-soft">
          <RotateCcw size={15} />
          {t.restart}
        </button>
      </div>
    </div>
  )
}
