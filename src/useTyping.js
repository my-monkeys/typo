import { useState, useEffect, useRef, useCallback } from 'react'
import { calcWPM, calcAccuracy } from './lib/metrics'

// text: string to type
// duration: number of seconds (timed mode) or null (quote mode)
export function useTyping(text, duration) {
  const [position, setPosition] = useState(0)
  const [charStates, setCharStates] = useState(() =>
    text.split('').map(char => ({ char, status: 'pending' }))
  )
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)
  const intervalRef = useRef(null)
  const positionRef = useRef(0)
  const startTimeRef = useRef(null)
  const doneRef = useRef(false)

  // Keep refs in sync so the keydown handler always has current values
  useEffect(() => { positionRef.current = position }, [position])
  useEffect(() => { startTimeRef.current = startTime }, [startTime])
  useEffect(() => { doneRef.current = done }, [done])

  // Timer: starts on first keypress, stops on done
  useEffect(() => {
    if (!startTime || done) return
    intervalRef.current = setInterval(() => {
      const newElapsed = (Date.now() - startTime) / 1000
      setElapsed(newElapsed)
      if (duration && newElapsed >= duration) {
        setDone(true)
        clearInterval(intervalRef.current)
      }
    }, 100)
    return () => clearInterval(intervalRef.current)
  }, [startTime, done, duration])

  const handleKey = useCallback((e) => {
    if (doneRef.current) return
    if (e.key === 'Tab') { e.preventDefault(); return }

    if (e.key === 'Backspace') {
      const pos = positionRef.current
      if (pos === 0) return
      setPosition(pos - 1)
      positionRef.current = pos - 1
      setCharStates(cs => {
        const next = [...cs]
        next[pos - 1] = { ...next[pos - 1], status: 'pending' }
        return next
      })
      return
    }

    if (e.key.length !== 1) return
    const pos = positionRef.current
    if (pos >= text.length) return

    if (!startTimeRef.current) {
      const now = Date.now()
      setStartTime(now)
      startTimeRef.current = now
    }

    const status = e.key === text[pos] ? 'correct' : 'error'
    setCharStates(cs => {
      const next = [...cs]
      next[pos] = { ...next[pos], status }
      return next
    })

    const newPos = pos + 1
    setPosition(newPos)
    positionRef.current = newPos

    // Quote mode: done when last char typed
    if (!duration && newPos >= text.length) {
      setDone(true)
      doneRef.current = true
    }
  }, [text, duration])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  const reset = useCallback((newText) => {
    clearInterval(intervalRef.current)
    const t = newText ?? text
    setCharStates(t.split('').map(char => ({ char, status: 'pending' })))
    setPosition(0)
    positionRef.current = 0
    setStartTime(null)
    startTimeRef.current = null
    setElapsed(0)
    setDone(false)
    doneRef.current = false
  }, [text])

  const correctCount = charStates.slice(0, position).filter(c => c.status === 'correct').length
  const wpm = elapsed > 0 ? calcWPM(correctCount, elapsed) : 0
  const accuracy = calcAccuracy(correctCount, position)
  const remaining = duration != null ? Math.max(0, duration - Math.floor(elapsed)) : null

  return { charStates, position, wpm, accuracy, elapsed, remaining, done, reset }
}
