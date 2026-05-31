import { wordsFr } from './words-fr'
import { wordsEn } from './words-en'
import { quotesFr } from './quotes-fr'
import { quotesEn } from './quotes-en'
import { snippets } from './snippets'
import { getDailyText } from './daily'

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)]

// rng: a function returning a float in [0,1). Pass Math.random for solo (random),
// or a seeded mulberry32 for versus (same text for everyone).
export function generateText(mode, lang, rng = Math.random) {
  if (mode === 'quote') {
    return pick(lang === 'fr' ? quotesFr : quotesEn, rng)
  }
  if (mode === 'code') {
    return pick(snippets, rng)
  }
  if (mode === 'daily') {
    return getDailyText(lang, quotesFr, quotesEn)
  }
  const words = lang === 'fr' ? wordsFr : wordsEn
  const result = []
  for (let i = 0; i < 200; i++) result.push(pick(words, rng))
  return result.join(' ')
}
