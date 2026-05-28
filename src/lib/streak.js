export function updateStreak(streak, isCorrect) {
  return isCorrect ? streak + 1 : 0
}
