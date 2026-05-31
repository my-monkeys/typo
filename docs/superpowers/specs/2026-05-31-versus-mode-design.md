# Design — Mode Versus

**Projet :** `typo` — typo.my-monkey.fr
**Date :** 2026-05-31
**Statut :** validé (brainstorming) → en attente du plan d'implémentation

## Objectif

Ajouter un mode multijoueur temps réel où l'on voit ses adversaires taper en direct
(jusqu'à 4 joueurs), via une salle privée rejointe par lien/code. L'application reste
un **site statique** ; le temps réel passe par **Supabase Realtime** (client only).

## Décisions (issues du brainstorming)

| Sujet | Décision |
|---|---|
| Appariement | Salle privée par **lien / code** (4 lettres). Pas de matchmaking, pas de comptes. |
| Nombre de joueurs | Jusqu'à **4** par salle. |
| Affichage adversaire | **Texte partagé**, ton caret + carets « fantômes » adverses + bandeau classement live. |
| Format de course | **Au choix de l'hôte** : « texte fixe » (1er arrivé) ou « chrono » (meilleur WPM). |
| Back-end | **Supabase Realtime** (broadcast positions + presence), projet existant réutilisé (tables `typo_`). |
| Identité | Pseudo auto **éditable** + couleur, sans inscription (mémorisé en `localStorage`). |
| Rematch | Même salle, l'hôte relance avec un nouveau texte. |
| Entrée par URL | Query param **`?v=CODE`** (aucun router ajouté, marche en hébergement statique). |

## Non-objectifs (YAGNI v1)

- Pas d'anti-triche : les positions sont **auto-déclarées par le client**, on fait confiance (c'est pour le fun). Explicitement assumé.
- Pas de classement/ELO persistant, pas de records versus stockés.
- Pas de chat, pas de comptes, pas de matchmaking public.

## Flux utilisateur

```
Landing → [Créer une course versus]
  → Lobby (code + lien partageable ; liste des joueurs en presence ;
           l'hôte règle format / mode / durée ; pseudo éditable)
  → l'hôte clique "Lancer" → décompte 3·2·1
  → Course (texte partagé ; ton caret + carets fantômes adverses ;
            bandeau classement live : initiale + WPM + % d'avancement)
  → Résultats (classement final) → [Rematch] (même salle, nouveau texte) ou [Quitter]

Lien partagé  /?v=ABCD  →  au chargement : rejoint directement le Lobby de la salle ABCD
```

Les modes solo existants (durée / citation / code / défi) sont **inchangés**.

## Architecture (frontières claires)

- **`src/lib/rng.js`** — PRNG seedé (mulberry32) + helpers de tirage. Refactor de
  `generateText(mode, lang, seed?)` pour être **déterministe** quand un seed est fourni
  → tous les joueurs obtiennent le même texte. *Pur, testable.*
- **`src/lib/versus-logic.js`** — fonctions **pures** : génération de code de salle,
  calcul du classement / vainqueur à partir de l'état des joueurs, throttle des updates.
  *Pur, testable sans réseau.*
- **`src/lib/supabase.js`** — init du client (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`).
- **`src/useVersus.js`** — hook qui encapsule **tout** le temps réel Supabase
  (channel par salle, broadcast position, presence join/leave, décompte, rematch).
  Interface : `createRoom(config)`, `joinRoom(code)`, `setNick(nick)`, `start()`,
  `sendProgress(state)` ; état exposé `{ phase, players, you, countdown, config }`.
  **Seule** pièce qui parle à Supabase.
- **`src/Versus/VersusLobby.jsx`**, **`VersusRace.jsx`**, **`VersusResults.jsx`** — UI.
  `VersusRace` réutilise `useTyping` avec un texte seedé et **désactive le pacer solo**
  (le ghost-cursor cible-WPM) au profit des carets adverses réels.
- **`src/App.jsx`** — au montage, si `location.search` contient `?v=CODE`, bascule vers
  le lobby de cette salle ; sinon flux normal. La landing gagne une entrée « Versus ».

## Données & temps réel (Supabase)

### Table `typo_versus_rooms`
| Colonne | Type | Note |
|---|---|---|
| `code` | text (PK) | 4 lettres majuscules |
| `config` | jsonb | `{ format:'race' / 'timed', mode, duration, lang, textSeed }` |
| `status` | text | `lobby` \| `racing` \| `done` |
| `host_id` | text | id client de l'hôte |
| `created_at` | timestamptz | défaut `now()` |

- **RLS** permissive (données éphémères non sensibles) : insert/select/update en anon,
  scoping minimal. Pas de delete client.
- **Purge** : cron quotidien (ou TTL) supprimant les salles de plus de 24 h.

### Channel Realtime `versus:{code}`
- **Presence** → roster live : `{ id, nick, color, joinedAt }` + détection déconnexion.
- **Broadcast `progress`** → `{ id, pos, errors, wpm, finished, finishedAt }`,
  **throttlé ~10/s** (sur intervalle ou tous les N caractères). **Non persisté.**
- **Broadcast `control`** → `start` (déclenche le décompte), `rematch` (nouveau seed).

### Synchronisation
- **Décompte** : l'hôte broadcast `start` ; chaque client décompte 3·2·1 localement à
  réception. Léger désync toléré (casual).
- **WPM / temps** : chaque client mesure son propre `elapsed` depuis son propre départ.
- **Classement** :
  - *Texte fixe* : 1er à `finished` gagne ; tri par `finishedAt` ; non-finishers par `pos`.
  - *Chrono* : à la fin du temps, chaque client broadcast son WPM final ; tri par WPM.

## Affichage course (jusqu'à 4)

Un seul bloc de texte : **ton caret** bien visible (accent du thème) ; **adversaires** =
carets colorés fins avec une initiale. Le **bandeau classement live** (initiale + WPM +
% d'avancement, trié) est le repère principal du « qui gagne ».

**Risque connu :** à 4 joueurs, les carets multiples peuvent charger l'écran.
**Mitigation :** carets adverses discrets, le classement porte l'info de rang ; on pourra
plafonner les carets visibles si nécessaire.

## Cas limites

- Salle introuvable / pleine (5ᵉ joueur) / déjà en course → messages clairs ; le
  retardataire attend la manche suivante (état « spectateur jusqu'à la prochaine »).
- Déconnexion (presence leave) → joueur marqué « déconnecté / DNF », la course continue.
- Hôte qui part → promotion du plus ancien joueur restant comme hôte.
- Supabase indisponible / env absent → **versus désactivé proprement** ; le solo n'est
  pas impacté.

## Tests

- **Unitaire (vitest, déjà en place)** :
  - déterminisme du RNG seedé (même seed → même texte) ;
  - génération de code de salle (format, collisions improbables) ;
  - calcul classement / vainqueur (fonction pure, scénarios race & chrono) ;
  - logique de throttle.
- **Manuel / Playwright** : 2 fenêtres pour un vrai 1v1, puis 4 (présence, carets,
  classement, déconnexion, rematch).
- La couche Realtime reste fine ; toute la logique « jugeable » vit dans les fonctions
  pures testées.

## Déploiement

- Reste **statique** : `.monkey` inchangé (`source: ./dist/`).
- Ajout de `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (publics, bakés au build) +
  `.env.example` documenté.
- **Prérequis (1×)** : ré-autoriser le MCP Supabase, choisir le projet existant,
  appliquer la migration `typo_versus_rooms` (+ RLS + Realtime activé sur la table/channel).

## Dépendances

- Ajout : `@supabase/supabase-js`. (On perd le « zéro dépendance runtime » — assumé.)
- Réutilise l'existant : `useTyping`, le design system (carets, thèmes), lucide-react.
