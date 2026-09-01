# Code Review — Phase 3b: History + Undo + Recalculate

**Reviewer:** code-reviewer agent  
**Ground truth:** `reference/legacy-prototype.sanitized.html`  
**Date:** 2026-09-01

---

## Build Evidence

```
npm run build   → exit 0
  ✓ Compiled successfully in 19.3s
  ✓ Linting and checking validity of types
  ✓ Generating static pages (9/9)
  Route /history  3.23 kB  (new, was 798 B placeholder)

npx tsc --noEmit → exit 0, stdout empty, stderr empty

npx eslint src --max-warnings 0 → exit 0, stdout empty, stderr empty
```

## Grep Evidence

```
"dummyRoom" in src/:
  firebase.ts:23  // comment: "The root defaults to \"dummyRoom\""
  firebase.ts:30  const RTDB_ROOT = process.env.NEXT_PUBLIC_RTDB_ROOT || "dummyRoom";
  firebase.ts:34  // comment: "(never a hardcoded \"dummyRoom\")"
  → All 3 hits are in firebase.ts only: the configurable fallback and explanatory
    comments. Zero hits in rounds.ts, History.tsx, ConfirmDialog.tsx, history/page.tsx.
    PASS.

": any" in src/: No results. PASS.

alert( in src/:
  History.tsx:8    // comment: "never confirm()/alert()"
  ConfirmDialog.tsx:6  // comment: "Never uses confirm() / alert()"
  → Comments only, no actual call. PASS.

confirm( in src/:
  rounds.ts:143   // comment: "confirm() replaced by the UI-level ConfirmDialog"
  History.tsx:8   // comment
  ConfirmDialog.tsx:5  // comment
  → Comments only. PASS.

prompt( in src/:
  ConfirmDialog.tsx:6  // comment only
  → PASS.

Emoji (visual scan of new files): none found. PASS.
```

## Acceptance Checklist Review

### /history page — server + metadata + client

- [x] `src/app/history/page.tsx`: server component, exports `metadata: { title: "ประวัติ | COSMO999" }`, imports and renders `<History />` from `@/components/History`
- [x] `History.tsx` is `"use client"`, uses `useHistory()` (real-time listener via `subscribeToList`)
- [x] Sorted newest-first: `[...history].sort((a, b) => b.id.localeCompare(a.id))` — matchId is `Date.now().toString()` so lexicographic descending = chronological descending. Matches legacy `sortedHistory.sort((a, b) => b.id - a.id)`.
- [x] Loading → Thai text + Loader2 spinner (`aria-live="polite"`)
- [x] Error → Thai text + TriangleAlert icon (`role="alert"`)
- [x] Empty → intentional ClipboardList icon + Thai invitation text (no fake data)

### Per-entry card

- [x] Time: `new Date(entry.timestamp).toLocaleString("th-TH")` — matches legacy `toLocaleDateString('th-TH') + toLocaleTimeString('th-TH')`
- [x] `groupName` displayed
- [x] Badge `x{multiplier}` with accent token colour
- [x] Per-player scores: colour via `scoreTone()` → `text-success` / `text-danger` / `text-text-muted` (no hardcoded hex)
- [x] Deleted player: `players.find(p => p.id === pId)` → if not found, renders `(ถูกลบ)` — matches legacy `pName = p ? p.name : '(ถูกลบ)'`
- [x] Commentary: MessageSquare lucide icon leads (no emoji), rendered only when `entry.commentary` is truthy
- [x] Undo button per round: Undo2 icon, sets `undoPending` state → opens ConfirmDialog

### Undo (atomic, port undoMatch L1044)

- [x] No `confirm()` call — ConfirmDialog in UI (`src/components/ConfirmDialog.tsx`, native `<dialog>` + `showModal()`)
- [x] `undoRound(matchId)` in `rounds.ts`:
  - `runTransaction(ref(database, DB_PATHS.root), ...)` — uses `DB_PATHS.root`, no literal `"dummyRoom"`
  - Guard: if `matchId` not in `history` → returns `undefined` (Firebase abort, not a bogus empty-room write). Matches legacy `if (!currentData.history[matchId]) return undefined`
  - Normalises via `normalizeRoom()` (the shared boundary function, now exported)
  - Loops `Object.entries(log.playerScores)`:
    - `findIndex(p => p.id === pId) > -1` guard → subtracts `scoreToRevert` from `totalScore`
    - `findIndex(g => g.id === log.groupId) > -1` guard → subtracts from `group.scores[pId]`
  - `delete newHistory[matchId]`
  - Returns `{ players, groups, history: newHistory }` — players/groups arrays, history object
  - `{ applyLocally: false }` — matches `saveRound` pattern, same reason (no root listener)
  - `catch → { committed: false }` — never throws
- [x] On `committed: false`: dialog stays open, inline Thai error displayed, data unchanged
- [x] On `committed: true`: `undoPending = null`, dialog closes

### Recalculate (port L1092)

- [x] Button on `/history` header opens ConfirmDialog before acting
- [x] `recalculateScores()` in `rounds.ts`:
  - `runTransaction(ref(database, DB_PATHS.root), ...)`
  - Zeros `totalScore: 0`, `latestScore: null` for every player
  - Zeros `group.scores[key] = 0` for every key in every group
  - Replays every `Object.values(room.history)`: adds `playerScores[pId]` back to player totals + group scores (guarded)
  - History unchanged — only players + groups written back
  - `{ applyLocally: false }`
  - `catch → { committed: false }`
- [x] Error path: Thai inline error, dialog stays open
- [x] Matches legacy `recalculateScoresFromHistory` L1092-1122 logic exactly

### Shape correctness

- [x] `players` written back as array (from `normalizeRoom` which uses `normalizeList<Player>`)
- [x] `groups` written back as array
- [x] `history` written back as object keyed by matchId (never converted to array)

### Code quality

- [x] No `any` — `normalizeRoom` uses `unknown` narrowed via `as Record<string, unknown>`, matching the comment in the original
- [x] No emoji anywhere in new files
- [x] All icons from lucide-react: Loader2, TriangleAlert, ClipboardList, MessageSquare, Undo2, RefreshCw, AlertTriangle, X
- [x] All UI text in Thai, all comments in English
- [x] No hardcoded hex — all colours via semantic tokens (`text-success`, `text-danger`, `text-accent`, `bg-danger`, etc.)
- [x] No new dependencies added
- [x] `reveal` CSS class used on `<article>` for entry animation — respects `prefers-reduced-motion` via the global `@media` rule in `globals.css`
- [x] Responsive: `max-w-2xl` container, `flex-wrap` on score chips, `sm:flex-row-reverse` on dialog buttons — mobile + iPad + desktop covered
- [x] No `alert()` / `confirm()` / `prompt()`
- [x] ConfirmDialog: native `<dialog>` + `showModal()`, Esc → `onClose`, backdrop click → `onClose`, busy locks both buttons, `aria-labelledby` + `aria-describedby`, focus trap by platform

### Special reviewer checks

| Item | Result |
|---|---|
| Transaction at `DB_PATHS.root` (no literal dummyRoom) | PASS — `ref(database, DB_PATHS.root)` in both `undoRound` and `recalculateScores` |
| `applyLocally: false` | PASS — present in both new functions, matching `saveRound` |
| Undo: subtracts player totalScore | PASS — `totalScore - scoreToRevert`, guarded |
| Undo: subtracts group score | PASS — `group.scores[pId] - scoreToRevert`, guarded |
| Undo: deletes history entry | PASS — `delete newHistory[matchId]`, atomic with above |
| Undo abort when entry already gone | PASS — returns `undefined` when `matchId` not in history |
| Shape: players array, groups array, history object | PASS |
| No `confirm()` in UI | PASS — only in comments |
| Deleted player displayed as `(ถูกลบ)` | PASS |

---

## Verdict

PASSED
