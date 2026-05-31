import { useState, useEffect, useCallback } from 'react'

const KEY = 'typo_theme'

// Initial theme is set pre-paint by an inline script in index.html, so the
// DOM is the source of truth on mount — we only mirror it into React state.
function currentTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function useTheme() {
  const [theme, setThemeState] = useState(currentTheme)

  const setTheme = useCallback((next) => {
    document.documentElement.dataset.theme = next
    localStorage.setItem(KEY, next)
    setThemeState(next)
  }, [])

  const toggle = useCallback(() => {
    setTheme(currentTheme() === 'light' ? 'dark' : 'light')
  }, [setTheme])

  // Follow the OS preference until the user makes an explicit choice.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = (e) => {
      if (localStorage.getItem(KEY)) return
      const next = e.matches ? 'light' : 'dark'
      document.documentElement.dataset.theme = next
      setThemeState(next)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return { theme, toggle }
}
