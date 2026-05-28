# Design — Groupe B : Mode code + Défi du jour

**Date :** 2026-05-28
**Projet :** `typo-poc` — typo.my-monkey.fr
**Scope :** 2 nouveaux modes de jeu

---

## Feature 1 — Mode code

L'utilisateur tape de courts snippets de code (JS, Python, CSS). Mode language-agnostique : un seul pool de snippets pour tous les utilisateurs, indépendant du switcher FR/EN.

### Données — `src/lib/snippets.js`

20 snippets courts, ASCII-safe (pas d'accents, pas de backticks ou caractères spéciaux exotiques), entre 60 et 150 caractères chacun. Exemples de langages représentés : JavaScript, Python, CSS. Une ligne ou deux maximum par snippet.

```js
export const snippets = [
  "const greet = (name) => `Hello, ${name}!`;",
  // ... 19 autres
]
```

Note : les backticks sont autorisés dans les snippets — l'utilisateur doit les taper. Pas d'apostrophes curlyness (utiliser `'` straight quotes uniquement).

### Mode

- Identifiant : `'code'`
- Fonctionne comme le mode `'quote'` : un snippet aléatoire à terminer
- Durée : null (pas de timer, finir le snippet)
- Best score clé : `typo_best_code` (sans lang — code est universel)

### LandingPage

- Nouveau bouton "Code" dans le sélecteur de mode, icône `Code2` (lucide-react)
- Labels : `{ fr: 'Code', en: 'Code' }` (même mot)
- Quand mode = 'code' : le duration picker est masqué (comme en mode citation)

### TypingTest — generateText

Nouveau cas dans `generateText(mode, lang)` :
```js
if (mode === 'code') {
  return snippets[Math.floor(Math.random() * snippets.length)]
}
```

---

## Feature 2 — Défi du jour

Chaque jour, tous les utilisateurs d'une même langue voient le même texte, déterminé par la date. Pas de backend — seed côté client basée sur `YYYY-MM-DD`.

### Seed — `src/lib/daily.js`

Fonction pure, testable en isolation :

```js
export function getDailyText(lang, quotesFr, quotesEn) {
  const date = new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'
  let h = 0
  for (let i = 0; i < date.length; i++) {
    h = (h * 31 + date.charCodeAt(i)) >>> 0
  }
  const list = lang === 'fr' ? quotesFr : quotesEn
  return list[h % list.length]
}
```

- Même résultat pour tous les utilisateurs FR ce jour-là
- Résultat différent pour EN (pool séparé)
- Change à minuit (UTC via `toISOString()`)

### Tests — `src/lib/daily.test.js`

- Même seed → même index (déterminisme)
- Date différente → résultat potentiellement différent
- Retourne bien une string du bon array (FR vs EN)

### Mode

- Identifiant : `'daily'`
- Durée : null (finir la citation)
- Best score clé : `typo_best_daily_YYYY-MM-DD_lang` (par jour ET par langue)
  - ex : `typo_best_daily_2026-05-28_fr`
  - Permet de voir si le score du jour a déjà été fait

### LandingPage

- Nouveau bouton "Défi du jour" / "Daily challenge", icône `Calendar` (lucide-react)
- Label FR : `'Défi du jour'`, EN : `'Daily challenge'`
- Quand mode = 'daily' : duration picker masqué
- Pas de sélection de lang spécifique — utilise le lang courant

### TypingTest — generateText

Nouveau cas :
```js
if (mode === 'daily') {
  return getDailyText(lang, quotesFr, quotesEn)
}
```

---

## Architecture — fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `src/lib/snippets.js` | Nouveau — export `snippets` array (20 snippets) |
| `src/lib/daily.js` | Nouveau — export `getDailyText(lang, quotesFr, quotesEn)` |
| `src/lib/daily.test.js` | Nouveau — tests Vitest (déterminisme, FR/EN) |
| `src/LandingPage.jsx` | Ajouter modes 'code' et 'daily' avec icônes Code2/Calendar |
| `src/TypingTest.jsx` | Ajouter cas 'code' et 'daily' dans generateText |

---

## Hors scope (v1)

- Best score "déjà fait aujourd'hui" — badge ou message spécial
- Partage du score du défi du jour sur réseaux sociaux
- Historique des défis passés
- Snippets filtrables par langage (JS only, Python only, etc.)
- Longueur du snippet configurable
