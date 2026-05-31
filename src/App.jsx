import { useState, useEffect } from 'react'
import { LandingPage } from './LandingPage'
import { TypingTest } from './TypingTest'
import { Results } from './Results'
import { Versus } from './Versus/Versus'

export default function App() {
  const [phase, setPhase] = useState('selector')
  const [config, setConfig] = useState(null)
  const [results, setResults] = useState(null)
  const [testKey, setTestKey] = useState(0)
  const [versus, setVersus] = useState(null) // { initialCode } | { createConfig, lang }

  useEffect(() => {
    if (config?.lang) document.documentElement.lang = config.lang
  }, [config?.lang])

  // Deep link: /?v=CODE → jump straight into that room.
  useEffect(() => {
    const code = new URLSearchParams(location.search).get('v')
    if (code) { setVersus({ initialCode: code, lang: localStorage.getItem('typo_lang') || 'fr' }); setPhase('versus') }
  }, [])

  function handleStart(cfg) { setConfig(cfg); setPhase('test') }
  function handleFinish(res) { setResults(res); setPhase('results') }
  function handleRestart() { setTestKey(k => k + 1); setPhase('test') }
  function handleBack() { setPhase('selector') }
  function handleVersus(cfg) { setVersus({ createConfig: cfg, lang: cfg.lang }); setPhase('versus') }
  function exitVersus() {
    history.replaceState(null, '', location.pathname) // drop ?v=
    setVersus(null); setPhase('selector')
  }

  return (
    <div style={{ minHeight: '100dvh' }}>
      {phase === 'selector' && <LandingPage onStart={handleStart} onVersus={handleVersus} />}
      {phase === 'test' && config && (
        <TypingTest key={testKey} config={config} onFinish={handleFinish} onRestart={handleRestart} />
      )}
      {phase === 'results' && results && config && (
        <Results results={results} config={config} onRestart={handleRestart} onBack={handleBack} />
      )}
      {phase === 'versus' && versus && (
        <Versus initialCode={versus.initialCode} createConfig={versus.createConfig} lang={versus.lang} onExit={exitVersus} />
      )}
    </div>
  )
}
