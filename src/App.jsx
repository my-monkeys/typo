import { useState, useEffect } from 'react'
import { ModeSelector } from './ModeSelector'
import { TypingTest } from './TypingTest'
import { Results } from './Results'

export default function App() {
  const [phase, setPhase] = useState('selector')
  const [config, setConfig] = useState(null)
  const [results, setResults] = useState(null)

  // key forces TypingTest to remount (and regenerate text) on restart
  const [testKey, setTestKey] = useState(0)

  // Keep <html lang> in sync with active language
  useEffect(() => {
    if (config?.lang) document.documentElement.lang = config.lang
  }, [config?.lang])

  function handleStart(cfg) {
    setConfig(cfg)
    setPhase('test')
  }

  function handleFinish(res) {
    setResults(res)
    setPhase('results')
  }

  function handleRestart() {
    setTestKey(k => k + 1)
    setPhase('test')
  }

  function handleBack() {
    setPhase('selector')
  }

  return (
    <div style={{ height: '100%' }}>
      {phase === 'selector' && (
        <ModeSelector onStart={handleStart} />
      )}
      {phase === 'test' && config && (
        <TypingTest key={testKey} config={config} onFinish={handleFinish} />
      )}
      {phase === 'results' && results && config && (
        <Results results={results} config={config} onRestart={handleRestart} onBack={handleBack} />
      )}
    </div>
  )
}
