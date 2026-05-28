export function calcWPM(correctChars, elapsedSeconds) {
  if (elapsedSeconds === 0) return 0
  return Math.round((correctChars / 5) / (elapsedSeconds / 60))
}

export function calcAccuracy(correctChars, totalChars) {
  if (totalChars === 0) return 100
  return Math.round((correctChars / totalChars) * 100)
}
