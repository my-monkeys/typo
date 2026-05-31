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
- **`src/lib/supabase.js`** — init du client, **calqué sur `alloc-warrior/src/lib/supabase.js`
  + `tempo-poc/lib/supabase.js`** : `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, warn
  console si absent (versus désactivé proprement), `realtime: { params: { eventsPerSecond: 10 } }`.
  Helpers : `getOrCreatePlayerId()` (`crypto.randomUUID()` en `localStorage`),
  `getStoredNick()`/`setStoredNick()`, `generateRoomCode()` (5 car., alphabet non ambigu
  `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`).
- **`src/useVersus.js`** — hook qui encapsule **tout** le temps réel Supabase, calqué sur
  `tempo-poc/lib/vs.js` (CRUD rooms/players + `postgres_changes`) **plus** le broadcast de
  positions propre à typo. Interface : `createRoom(config)`, `joinRoom(code)`, `setNick(nick)`,
  `start()`, `sendProgress(state)` ; état exposé `{ phase, players, you, countdown, config }`.
  **Seule** pièce qui parle à Supabase.
- **`src/Versus/VersusLobby.jsx`**, **`VersusRace.jsx`**, **`VersusResults.jsx`** — UI.
  `VersusRace` réutilise `useTyping` avec un texte seedé et **désactive le pacer solo**
  (le ghost-cursor cible-WPM) au profit des carets adverses réels.
- **`src/App.jsx`** — au montage, si `location.search` contient `?v=CODE`, bascule vers
  le lobby de cette salle ; sinon flux normal. La landing gagne une entrée « Versus ».

## Données & temps réel (Supabase)

Aligné sur la convention du **Supabase partagé** my-monkey (projet
`klliwmgdyuatstjvzzbb`, tables préfixées par projet). Patron de référence :
`tempo-poc/lib/vs.js` (mode versus existant) + init client `alloc-warrior/src/lib/supabase.js`.

**Découpage clé** : l'**état durable** vit en base et se synchronise via `postgres_changes`
(comme tempo) ; seules les **positions de caret haute fréquence** passent par **Broadcast**
(éphémère, jamais écrit en DB).

### Table `typo_versus_rooms`
| Colonne | Type | Note |
|---|---|---|
| `id` | uuid (PK) | `gen_random_uuid()` |
| `code` | text (unique) | 5 car., alphabet non ambigu (cf. `generateGameCode`) |
| `config` | jsonb | `{ format:'race' / 'timed', mode, duration, lang, textSeed }` |
| `status` | text | `lobby` / `racing` / `done` |
| `host_id` | text | playerId de l'hôte |
| `created_at` | timestamptz | défaut `now()` |

### Table `typo_versus_players`
| Colonne | Type | Note |
|---|---|---|
| `id` | uuid (PK) | |
| `room_id` | uuid (FK → rooms.id) | |
| `player_id` | text | `crypto.randomUUID()` persistant (localStorage) |
| `nick` | text | pseudo éditable |
| `color` | text | couleur assignée |
| `is_host` | bool | |
| `finished` | bool | défaut `false` |
| `finished_at` | timestamptz | null tant que pas fini |
| `wpm` | int | WPM final |
| `accuracy` | int | précision finale |
| `joined_at` | timestamptz | défaut `now()`, ordre du roster |

- **RLS** permissive (données éphémères non sensibles) : insert/select/update anon,
  comme les autres apps du projet partagé. Pas de delete client.
- **Purge** : cron quotidien (ou TTL) supprimant les salles > 24 h.

### Temps réel — channel `typo_versus_<roomId>`
- **`postgres_changes`** (état durable, source de vérité — patron tempo) : abonnement `*`
  sur `typo_versus_players` (filtre `room_id=eq.<id>`) → roster, arrivées/départs,
  fin/résultats ; et sur `typo_versus_rooms` (filtre `id=eq.<id>`) → `status`
  (`lobby → racing → done`) et `config` (rematch = nouveau `textSeed`).
- **Broadcast `progress`** (éphémère, **non persisté**) : chaque client émet
  `{ playerId, pos, errors, wpm }` **throttlé ~10/s** ; les autres rendent les carets
  fantômes + le classement live. (`realtime.eventsPerSecond: 10` côté client, cf. tempo.)
- **Presence** (optionnel) : liveness pour marquer « déconnecté / DNF » pendant la course
  si un joueur disparaît du channel.

### Synchronisation & fin
- **Départ** : l'hôte passe `rooms.status` à `racing` (+ `textSeed`) → `postgres_changes`
  prévient tout le monde → décompte 3·2·1 local. Léger désync toléré (casual).
- **WPM / temps** : chaque client mesure son propre `elapsed` depuis son propre départ.
- **Fin / classement** (fonction **pure**, testée) :
  - *Texte fixe* : à `finished`, le client écrit `finished / finished_at / wpm / accuracy`
    en DB ; 1er arrivé gagne ; tri par `finished_at` ; non-finishers par dernière position.
  - *Chrono* : à la fin du temps, chaque client écrit son `wpm` final ; tri par WPM.

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
- Ajout de `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (projet partagé
  `klliwmgdyuatstjvzzbb`, clés publiques bakées au build) + `.env.example` documenté.
- **Prérequis (1×)** : ré-autoriser le MCP Supabase, puis appliquer sur le projet partagé
  la migration créant `typo_versus_rooms` + `typo_versus_players` (+ RLS anon + tables
  ajoutées à la publication Realtime `supabase_realtime` pour `postgres_changes`).

## Dépendances

- Ajout : `@supabase/supabase-js` `^2.106` (aligné sur les siblings : alloc-warrior 2.102,
  landing-page 2.103, tempo-poc 2.106). On perd le « zéro dépendance runtime » — assumé.
- Réutilise l'existant : `useTyping`, le design system (carets, thèmes), lucide-react.
