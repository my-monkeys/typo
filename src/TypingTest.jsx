import { useMemo, useEffect } from 'react'
import { Zap } from 'lucide-react'
import { useTyping } from './useTyping'
import { generateText } from './lib/textgen'

export function TypingTest({ config, onFinish, onRestart }) {
  const { mode, duration, lang, targetWPM } = config

  const text = useMemo(() => generateText(mode, lang), [mode, lang])

  const { charStates, position, wpm, accuracy, elapsed, remaining, done, streak } = useTyping(text, duration)

  useEffect(() => {
    if (done) onFinish({ wpm, accuracy })
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tab / Escape → restart
  useEffect(() => {
    function handleRestartKey(e) {
      if (e.key === 'Tab' || e.key === 'Escape') {
        e.preventDefault()
        onRestart()
      }
    }
    window.addEventListener('keydown', handleRestartKey)
    return () => window.removeEventListener('keydown', handleRestartKey)
  }, [onRestart])

  // Update document title with live WPM
  useEffect(() => {
    if (wpm > 0) document.title = `${wpm} WPM | typo`
    return () => {
      document.title = lang === 'fr'
        ? 'Test de vitesse de frappe - WPM | my-monkey'
        : 'Typing Speed Test - WPM | my-monkey'
    }
  }, [wpm, lang])

  const timerLabel = duration != null
    ? `${remaining}s`
    : `${Math.floor((charStates.filter(c => c.status !== 'pending').length / charStates.length) * 100)}%`

  // Ghost cursor position: chars/sec = targetWPM * 5 / 60; -1 = hidden before first keypress
  const ghostPos = elapsed > 0
    ? Math.min(text.length - 1, Math.floor(elapsed * targetWPM * 5 / 60))
    : -1

  const colorFor = (status) =>
    status === 'correct' ? 'var(--correct)'
    : status === 'error' ? 'var(--error)'
    : 'var(--text-faint)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', gap: '2.5rem', padding: '2rem', position: 'relative', zIndex: 2 }}>

      {/* Timer + streak */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', width: '100%', maxWidth: '720px' }}>
        <div className="mono tnum" style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--accent)', minWidth: '4.5rem', textAlign: 'center', letterSpacing: '-0.02em' }}>
          {timerLabel}
        </div>
        {streak > 5 && (
          <div className="mono tnum" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: streak >= 20 ? 'var(--accent)' : 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 600 }}>
            <Zap size={15} fill={streak >= 20 ? 'currentColor' : 'none'} />
            {streak}
          </div>
        )}
      </div>

      {/* Typing area */}
      <div
        className="mono"
        style={{
          maxWidth: '720px',
          width: '100%',
          fontSize: '1.4rem',
          lineHeight: '2.2rem',
          letterSpacing: '0.01em',
          userSelect: 'none',
          color: 'var(--text-faint)',
        }}
      >
        {charStates.map((cs, i) => {
          const isCursor = i === position
          const isGhost = i === ghostPos
          return (
            <span
              key={i}
              className={[isCursor ? 'cursor' : '', isGhost ? 'ghost-cursor' : ''].filter(Boolean).join(' ')}
              style={{ color: colorFor(cs.status) }}
            >
              {cs.char}
            </span>
          )
        })}
      </div>

      {/* Live WPM */}
      <div className="mono tnum" style={{ color: 'var(--text-dim)', fontSize: '0.875rem', minHeight: '1.2rem' }}>
        {wpm > 0 ? `${wpm} WPM · ${accuracy}%` : ''}
      </div>

      <div className="mono" style={{ color: 'var(--text-faint)', fontSize: '0.72rem', letterSpacing: '0.04em' }}>
        {lang === 'fr' ? 'Tab / Échap · recommencer' : 'Tab / Esc · restart'}
      </div>
    </div>
  )
}
