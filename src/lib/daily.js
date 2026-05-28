export function getDailyText(lang, quotesFr, quotesEn) {
  const date = new Date().toISOString().slice(0, 10)
  let h = 0
  for (let i = 0; i < date.length; i++) {
    h = (h * 31 + date.charCodeAt(i)) >>> 0
  }
  const list = lang === 'fr' ? quotesFr : quotesEn
  return list[h % list.length]
}
