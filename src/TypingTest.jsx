import { useMemo, useEffect } from 'react'
import { Zap } from 'lucide-react'
import { useTyping } from './useTyping'
import { wordsFr } from './lib/words-fr'
import { wordsEn } from './lib/words-en'
import { quotesFr } from './lib/quotes-fr'
import { quotesEn } from './lib/quotes-en'

function generateText(mode, lang) {
  if (mode === 'quote') {
    const list = lang === 'fr' ? quotesFr : quotesEn
    return list[Math.floor(Math.random() * list.length)]
  }
  const words = lang === 'fr' ? wordsFr : wordsEn
  const result = []
  for (let i = 0; i < 200; i++) {
    result.push(words[Math.floor(Math.random() * words.length)])
  }
  return result.join(' ')
}

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '2rem', padding: '2rem' }}>

      {/* Timer + streak row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', width: '100%', maxWidth: '700px' }}>
        <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', minWidth: '4rem', textAlign: 'center' }}>
          {timerLabel}
        </div>
        {streak > 5 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: streak >= 20 ? 'var(--accent)' : 'var(--text-dim)', fontSize: '0.9rem', fontWeight: '600' }}>
            <Zap size={15} />
            {streak}
          </div>
        )}
      </div>

      {/* Typing area */}
      <div
        style={{
          maxWidth: '700px',
          width: '100%',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '1.25rem',
          lineHeight: '2rem',
          userSelect: 'none',
          color: 'var(--pending)',
        }}
      >
        {charStates.map((cs, i) => {
          const isCursor = i === position
          const isGhost = i === ghostPos
          return (
            <span
              key={i}
              className={[isCursor ? 'cursor' : '', isGhost ? 'ghost-cursor' : ''].filter(Boolean).join(' ')}
              style={{
                color: cs.status === 'correct'
                  ? 'var(--correct)'
                  : cs.status === 'error'
                  ? 'var(--error)'
                  : 'var(--pending)',
              }}
            >
              {cs.char}
            </span>
          )
        })}
      </div>

      {/* Live WPM */}
      {wpm > 0 && (
        <div style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
          {wpm} WPM · {accuracy}%
        </div>
      )}
    </div>
  )
}
