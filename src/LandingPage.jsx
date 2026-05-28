import { useState } from 'react'
import { Timer, Quote } from 'lucide-react'

const DURATIONS = [15, 30, 60]

const content = {
  fr: {
    hero: {
      title: 'Testez votre vitesse de frappe',
      subtitle: 'Mesurez votre WPM en quelques secondes, en français et en anglais.',
    },
    stats: ['Vitesse moyenne : 40 WPM', 'Rapide : 70 WPM', 'Record mondial : 216 WPM'],
    modes: { duration: 'Durée', quote: 'Citation' },
    start: 'Commencer le test',
    seo: {
      whatTitle: "Qu'est-ce que le WPM ?",
      whatText: "Le WPM (Words Per Minute) est l'unité de mesure standard de la vitesse de frappe. Il correspond au nombre de mots de 5 caractères tapés correctement en une minute. Un score élevé en WPM reflète à la fois la rapidité et la précision.",
      levelsTitle: 'Vitesses de référence',
      levels: [
        ['Débutant', '20–35 WPM'],
        ['Intermédiaire', '35–55 WPM'],
        ['Avancé', '55–80 WPM'],
        ['Expert', '80–100 WPM'],
        ['Professionnel', '100+ WPM'],
      ],
      tipsTitle: 'Comment progresser ?',
      tips: [
        "Entraînez-vous régulièrement — 10 minutes par jour suffisent pour progresser.",
        "Corrigez vos erreurs plutôt que de les ignorer — la précision prime sur la vitesse.",
        "Regardez l'écran, pas le clavier — la frappe aveugle est la compétence clé à développer.",
      ],
    },
  },
  en: {
    hero: {
      title: 'Test your typing speed',
      subtitle: 'Measure your WPM in seconds, in French and English.',
    },
    stats: ['Average speed: 40 WPM', 'Fast: 70 WPM', 'World record: 216 WPM'],
    modes: { duration: 'Timed', quote: 'Quote' },
    start: 'Start the test',
    seo: {
      whatTitle: 'What is WPM?',
      whatText: 'WPM (Words Per Minute) is the standard unit for measuring typing speed. It counts the number of 5-character words typed correctly per minute. A high WPM score reflects both speed and accuracy.',
      levelsTitle: 'Reference speeds',
      levels: [
        ['Beginner', '20–35 WPM'],
        ['Intermediate', '35–55 WPM'],
        ['Advanced', '55–80 WPM'],
        ['Expert', '80–100 WPM'],
        ['Professional', '100+ WPM'],
      ],
      tipsTitle: 'How to improve?',
      tips: [
        'Practice daily — 10 minutes a day is enough to see real progress.',
        'Focus on accuracy — precision comes before speed.',
        'Look at the screen, not the keyboard — touch typing is the key skill to develop.',
      ],
    },
  },
}

export function LandingPage({ onStart }) {
  const [lang, setLang] = useState(() => localStorage.getItem('typo_lang') || 'fr')
  const [mode, setMode] = useState('duration')
  const [duration, setDuration] = useState(30)
  const t = content[lang]

  function handleLang(l) {
    setLang(l)
    localStorage.setItem('typo_lang', l)
  }

  function handleStart() {
    onStart({ mode, duration: mode === 'duration' ? duration : null, lang })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(8px)',
        zIndex: 10,
      }}>
        <span style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text)', letterSpacing: '-0.01em' }}>
          my-monkey <span style={{ color: 'var(--accent)' }}>/ typo</span>
        </span>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {['fr', 'en'].map(l => (
            <button key={l} onClick={() => handleLang(l)} style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid',
              borderColor: lang === l ? 'var(--accent)' : 'var(--border)',
              background: lang === l ? 'var(--accent-light)' : 'transparent',
              color: lang === l ? 'var(--accent)' : 'var(--text-dim)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>{l}</button>
          ))}
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, maxWidth: '720px', width: '100%', margin: '0 auto', padding: '3rem 1.5rem 4rem', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

        {/* Headline */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: 'clamp(1.75rem, 5vw, 2.75rem)',
            fontWeight: '800',
            color: 'var(--text)',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            marginBottom: '0.875rem',
          }}>
            {t.hero.title}
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-dim)', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
            {t.hero.subtitle}
          </p>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          {t.stats.map((s, i) => (
            <span key={i} style={{ fontSize: '0.875rem', color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
              {s}
            </span>
          ))}
        </div>

        {/* Test card */}
        <div style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          borderRadius: '1rem',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
        }}>

          {/* Mode picker */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {([['duration', t.modes.duration, Timer], ['quote', t.modes.quote, Quote]]).map(([m, label, Icon]) => (
              <button key={m} onClick={() => setMode(m)} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 1.1rem',
                borderRadius: '0.5rem',
                border: '1px solid',
                borderColor: mode === m ? 'var(--accent)' : 'var(--border)',
                background: mode === m ? 'var(--accent-light)' : 'var(--bg)',
                color: mode === m ? 'var(--accent)' : 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: mode === m ? '600' : '400',
              }}>
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Duration picker */}
          {mode === 'duration' && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {DURATIONS.map(d => (
                <button key={d} onClick={() => setDuration(d)} style={{
                  width: '3.25rem',
                  height: '3.25rem',
                  borderRadius: '0.5rem',
                  border: '1px solid',
                  borderColor: duration === d ? 'var(--accent)' : 'var(--border)',
                  background: duration === d ? 'var(--accent-light)' : 'var(--bg)',
                  color: duration === d ? 'var(--accent)' : 'var(--text-dim)',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                }}>{d}s</button>
              ))}
            </div>
          )}

          {/* Start button */}
          <button onClick={handleStart} style={{
            padding: '0.8rem 2.5rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: 'var(--accent)',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '700',
            letterSpacing: '0.01em',
            boxShadow: '0 2px 12px rgba(79,70,229,0.3)',
          }}>
            {t.start}
          </button>
        </div>

        {/* SEO content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>

          {/* What is WPM */}
          <section>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text)', marginBottom: '0.625rem' }}>
              {t.seo.whatTitle}
            </h2>
            <p style={{ color: 'var(--text-dim)', lineHeight: 1.75, fontSize: '0.95rem' }}>
              {t.seo.whatText}
            </p>
          </section>

          {/* Reference speeds */}
          <section>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text)', marginBottom: '0.625rem' }}>
              {t.seo.levelsTitle}
            </h2>
            <div style={{ border: '1px solid var(--border)', borderRadius: '0.625rem', overflow: 'hidden' }}>
              {t.seo.levels.map(([level, speed], i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.65rem 1rem',
                  background: i % 2 === 0 ? 'var(--bg)' : 'var(--bg-subtle)',
                  borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ color: 'var(--text)', fontSize: '0.9rem' }}>{level}</span>
                  <span style={{ color: 'var(--accent)', fontWeight: '600', fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>{speed}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Tips */}
          <section>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text)', marginBottom: '0.625rem' }}>
              {t.seo.tipsTitle}
            </h2>
            <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {t.seo.tips.map((tip, i) => (
                <li key={i} style={{ color: 'var(--text-dim)', lineHeight: 1.7, fontSize: '0.95rem' }}>{tip}</li>
              ))}
            </ol>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: '1.25rem', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>my-monkey.fr</span>
      </footer>
    </div>
  )
}
