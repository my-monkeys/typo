export function bestKey(mode, duration, lang) {
  if (mode === 'duration') return `typo_best_duration_${duration}_${lang}`
  return `typo_best_quote_${lang}`
}

export function getBest(key) {
  const val = localStorage.getItem(key)
  return val !== null ? Number(val) : null
}

export function setBest(key, value) {
  localStorage.setItem(key, String(value))
}
