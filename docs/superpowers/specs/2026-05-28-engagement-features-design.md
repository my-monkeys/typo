# Design — Engagement Features (Groupe A)

**Date :** 2026-05-28
**Projet :** `typo-poc` — typo.my-monkey.fr
**Scope :** 3 features d'engagement pour la phase de test

---

## Features

### 1. Raccourci clavier pour rejouer (Tab / Échap)

Pendant la phase de test, appuyer sur **Tab** ou **Échap** relance immédiatement un nouveau test avec la même config (même mode, durée, langue, targetWPM). Aucune interaction souris requise.

**Implémentation :**
- `TypingTest.jsx` reçoit une nouvelle prop `onRestart()` depuis `App.jsx`
- Un `keydown` listener global dans `TypingTest` détecte `e.key === 'Tab' || e.key === 'Escape'`
- Sur détection : `e.preventDefault()` + appel `onRestart()`
- `App.jsx` : `handleRestart` existant est passé à `TypingTest` en tant que `onRestart`
- Le `testKey++` existant remonte TypingTest avec un nouveau texte généré — aucun changement à `useTyping`

**Hors scope :** raccourci sur l'écran résultats (déjà géré par les boutons existants).

---

### 2. Streak counter

Pendant le test, un compteur affiche le nombre de **caractères corrects consécutifs** sans faute.

**Logique dans `useTyping.js` :**
- Nouvel état : `const [streak, setStreak] = useState(0)`
- Frappe correcte (`status === 'correct'`) → `setStreak(s => s + 1)`
- Frappe incorrecte (`status === 'error'`) → `setStreak(0)`
- Backspace → pas de reset (l'erreur a déjà remis streak à 0 quand elle s'est produite)
- `reset()` → `setStreak(0)`
- Exposé dans le return : `{ ..., streak }`

**Affichage dans `TypingTest.jsx` :**
- Visible uniquement quand `streak > 5` (en dessous c'est du bruit)
- Icône `Zap` (lucide-react) + chiffre
- Couleur : `var(--accent)` si `streak >= 20`, sinon `var(--text-dim)`
- Positionné à droite du timer/chrono (même ligne)

---

### 3. Ghost cursor

Un deuxième curseur semi-transparent avance automatiquement au rythme d'une vitesse cible configurable. L'utilisateur "race" contre lui.

**Config :**
- `targetWPM` ajouté à l'objet `config = { mode, duration, lang, targetWPM }`
- Valeur par défaut : `60`
- Options : `40 / 60 / 80 / 100` WPM — sélecteur sur `LandingPage.jsx` dans la test card

**Calcul de position (dans `TypingTest.jsx`) :**
```js
const ghostPos = Math.min(
  text.length - 1,
  Math.floor(elapsed * targetWPM * 5 / 60)
)
```
- `elapsed` vient de `useTyping` (secondes écoulées depuis première frappe)
- Ghost ne démarre pas avant la première frappe (`elapsed === 0` → `ghostPos = 0`, pas de rendu)
- Ghost gèle à sa position courante quand `done === true` (ne disparaît pas, reste visible)

**Rendu :**
- Le span à index `ghostPos` reçoit `className="ghost-cursor"` (en plus du `cursor` réel si même position)
- CSS : `border-right: 2px solid var(--pending)` + pas d'animation (statique, visible en permanence)
- Peut coexister avec `.cursor` sur le même span (border-left + border-right)

**CSS à ajouter dans `index.css` :**
```css
.ghost-cursor {
  border-right: 2px solid var(--pending);
}
```

---

## Architecture — fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `src/useTyping.js` | Ajouter état `streak`, logique reset/increment, exposer dans return |
| `src/TypingTest.jsx` | Prop `onRestart`, listener Tab/Échap, affichage streak, ghost cursor |
| `src/LandingPage.jsx` | Sélecteur `targetWPM` (40/60/80/100) dans la test card, inclus dans config |
| `src/index.css` | Ajouter `.ghost-cursor { border-right: 2px solid var(--pending); }` |
| `src/App.jsx` | Passer `onRestart={handleRestart}` à `TypingTest` |

---

## Hors scope (v1)

- Affichage du ghost cursor sur l'écran résultats ("tu avais X WPM d'avance")
- Persistence du targetWPM en localStorage
- Animation du ghost cursor
- Son sur streak milestone
