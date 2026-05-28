import { useMemo, useEffect } from 'react'
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

export function TypingTest({ config, onFinish }) {
  const { mode, duration, lang } = config

  const text = useMemo(() => generateText(mode, lang), [mode, lang])

  const { charStates, position, wpm, accuracy, remaining, done } = useTyping(text, duration)

  useEffect(() => {
    if (done) onFinish({ wpm, accuracy })
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '2rem', padding: '2rem' }}>
      {/* Timer / progress */}
      <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', minWidth: '4rem', textAlign: 'center' }}>
        {timerLabel}
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
          return (
            <span
              key={i}
              className={isCursor ? 'cursor' : ''}
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
