import { useState } from 'react'
import { Timer, Quote, Code2, Calendar, Sun, Moon } from 'lucide-react'
import { useTheme } from './useTheme'
import { MonkeyFooter } from './MonkeyFooter'

const DURATIONS = [15, 30, 60]
const TARGET_WPMS = [40, 60, 80, 100]

const content = {
  fr: {
    hero: {
      title: 'Testez votre vitesse de frappe',
      subtitle: 'Mesurez votre WPM en quelques secondes, en français et en anglais.',
    },
    stats: [['Moyenne', '40'], ['Rapide', '70'], ['Record du monde', '216']],
    modes: { duration: 'Durée', quote: 'Citation', code: 'Code', daily: 'Défi du jour' },
    start: 'Commencer le test',
    versus: 'Jouer en versus',
    targetWpm: 'Vitesse cible (WPM)',
    theme: 'Changer de thème',
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
    stats: [['Average', '40'], ['Fast', '70'], ['World record', '216']],
    modes: { duration: 'Timed', quote: 'Quote', code: 'Code', daily: 'Daily challenge' },
    start: 'Start the test',
    versus: 'Play versus',
    targetWpm: 'Target WPM',
    theme: 'Toggle theme',
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

const MODES = [
  ['duration', Timer],
  ['quote', Quote],
  ['code', Code2],
  ['daily', Calendar],
]

export function LandingPage({ onStart, onVersus }) {
  const [lang, setLang] = useState(() => localStorage.getItem('typo_lang') || 'fr')
  const [mode, setMode] = useState('duration')
  const [duration, setDuration] = useState(30)
  const [targetWPM, setTargetWPM] = useState(60)
  const { theme, toggle } = useTheme()
  const t = content[lang]

  function handleLang(l) {
    setLang(l)
    localStorage.setItem('typo_lang', l)
  }

  function handleStart() {
    onStart({ mode, duration: mode === 'duration' ? duration : null, lang, targetWPM })
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 2 }}>

      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0.9rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        background: 'var(--header-bg)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 20,
      }}>
        <span className="mono" style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
          my-monkey <span style={{ color: 'var(--accent)' }}>/ typo</span>
        </span>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {['fr', 'en'].map(l => (
            <button
              key={l}
              onClick={() => handleLang(l)}
              className={`chip ${lang === l ? 'is-active' : ''}`}
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}
            >{l}</button>
          ))}
          <span style={{ width: 1, height: '1.4rem', background: 'var(--border)', margin: '0 0.25rem' }} />
          <button className="icon-btn" onClick={toggle} aria-label={t.theme} title={t.theme}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 'var(--maxw)', width: '100%', margin: '0 auto', padding: '3.5rem 1.5rem 4.5rem', display: 'flex', flexDirection: 'column', gap: '2.75rem' }}>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 5.5vw, 3rem)',
            fontWeight: 800,
            lineHeight: 1.06,
            letterSpacing: '-0.03em',
            textWrap: 'balance',
            marginBottom: '0.9rem',
          }}>
            {t.hero.title}
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-dim)', maxWidth: '42ch', margin: '0 auto', lineHeight: 1.6 }}>
            {t.hero.subtitle}
          </p>
        </div>

        {/* reference stats — mono, faint */}
        <div className="mono tnum" style={{ display: 'flex', justifyContent: 'center', gap: '1.75rem', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-faint)' }}>
          {t.stats.map(([label, val], i) => (
            <span key={i}>
              {label} <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>{val}</span>
            </span>
          ))}
        </div>

        {/* test config panel */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.25rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.75rem',
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {MODES.map(([m, Icon]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`chip ${mode === m ? 'is-active' : ''}`}
                style={{ padding: '0.5rem 1.05rem' }}
              >
                <Icon size={14} />
                {t.modes[m]}
              </button>
            ))}
          </div>

          {mode === 'duration' && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`chip tnum ${duration === d ? 'is-active' : ''}`}
                  style={{ width: '3.25rem', height: '3.25rem', justifyContent: 'center', fontSize: '0.95rem', fontWeight: 600 }}
                >{d}s</button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {t.targetWpm}
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {TARGET_WPMS.map(w => (
                <button
                  key={w}
                  onClick={() => setTargetWPM(w)}
                  className={`chip tnum ${targetWPM === w ? 'is-active' : ''}`}
                  style={{ width: '3rem', height: '2.25rem', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 600 }}
                >{w}</button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleStart} style={{ marginTop: '0.25rem' }}>
            {t.start}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => onVersus({ format: mode === 'duration' ? 'timed' : 'race', mode, duration: mode === 'duration' ? duration : null, lang, targetWPM })}
            style={{ marginTop: '0.25rem' }}
          >
            {t.versus}
          </button>
        </div>

        {/* SEO content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.75rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>

          <section>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.7rem', letterSpacing: '-0.01em' }}>
              {t.seo.whatTitle}
            </h2>
            <p style={{ color: 'var(--text-dim)', lineHeight: 1.75, fontSize: '0.95rem', maxWidth: '65ch' }}>
              {t.seo.whatText}
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.85rem', letterSpacing: '-0.01em' }}>
              {t.seo.levelsTitle}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              {t.seo.levels.map(([level, speed], i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  padding: '0.6rem 0',
                  borderBottom: i < t.seo.levels.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: '0.95rem' }}>{level}</span>
                  <span className="mono tnum" style={{ color: 'var(--accent)', fontWeight: 500, fontSize: '0.9rem' }}>{speed}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.85rem', letterSpacing: '-0.01em' }}>
              {t.seo.tipsTitle}
            </h2>
            <ol style={{ listStyle: 'none', counterReset: 'tip', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {t.seo.tips.map((tip, i) => (
                <li key={i} style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', color: 'var(--text-dim)', lineHeight: 1.65, fontSize: '0.95rem', maxWidth: '65ch' }}>
                  <span className="mono tnum" style={{ color: 'var(--accent)', fontWeight: 600, flexShrink: 0, paddingTop: '0.05rem' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {tip}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>

      <MonkeyFooter lang={lang} />
    </div>
  )
}
