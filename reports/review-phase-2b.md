# Code review - phase 2b (round setup, client-side only)

Reviewer: code-reviewer agent
Date: 2026-08-31

Scope reviewed:
- `src/components/RoundPlayerSelect.tsx` (new)
- `src/components/MultiplierPicker.tsx` (new)
- `src/components/RoundSetup.tsx` (new)
- `src/app/page.tsx` (edited)

Ground truth: `reference/legacy-prototype.html`

---

## 1. Commands run and real output

### 1.1 Working tree under review

```
$ git log --oneline -5
b35f99f bugfix: config .gitignore
0638537 phase2a: part A upgrade auditor agent + part B protect dev path + path c user feature
4ef9705 phase1: create typed Firebase data layer to read real-time data
47ef696 phase0: edit data-shape + add favicon + clear boilerplate
1d486fd phase0: initial commit

$ git status --short
 M .gitignore
 M src/app/page.tsx
?? src/components/MultiplierPicker.tsx
?? src/components/RoundPlayerSelect.tsx
?? src/components/RoundSetup.tsx
```

### 1.2 Build (required evidence)

```
$ npm run build

> cosmo999@0.1.0 build
> next build

   Next.js 15.5.24
   - Environments: .env.local

   Creating an optimized production build ...
 Compiled successfully in 2.1s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/5) ...
   Generating static pages (1/5)
   Generating static pages (2/5)
   Generating static pages (3/5)
 Generating static pages (5/5)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
/                                        52.8 kB         155 kB
/icon.svg                                    0 B            0 B
/_not-found                                993 B         104 kB
+ First Load JS shared by all             103 kB
  chunks/255-c5a697ddbf82d774.js         46.4 kB
  chunks/4bd1b696-c023c6e3521b1417.js    54.2 kB
  other shared chunks (total)            1.97 kB

(Static)  prerendered as static content
```

Build finished with no errors and no lint or type errors
(`tsconfig.json` has `"strict": true`).

### 1.3 No `any`

```
$ grep -rnE ": any|as any|<any>|any\[\]" src
EXIT=1
```

Empty output (exit 1 = no match). PASS.

### 1.4 Emoji scan

`grep -P` needs a UTF-8 locale on this machine, so the scan was run with
`LC_ALL=en_US.UTF-8`, split per target:

```
$ export LC_ALL=en_US.UTF-8
$ grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src
EXIT_src=1

$ grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" CLAUDE.md
EXIT_claudemd=1

$ grep -rlP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" .claude
.claude/skills/ui-ux-pro-max/data/charts.csv
.claude/skills/ui-ux-pro-max/data/phosphor-icons-upstream.json
.claude/skills/ui-ux-pro-max/data/products.csv
.claude/skills/ui-ux-pro-max/data/styles.csv
.claude/skills/ui-ux-pro-max/references/pro-rules.md
.claude/skills/ui-ux-pro-max/scripts/core.py
.claude/skills/ui-ux-pro-max/scripts/design_system.py
.claude/skills/ui-ux-pro-max/scripts/search.py
.claude/skills/ui-ux-pro-max/scripts/tests/test_design_system_mode.py
.claude/skills/ui-ux-pro-max/scripts/tests/test_style_taxonomy.py
.claude/skills/ui-ux-pro-max/scripts/validate_data.py
```

`src` and `CLAUDE.md` are clean. All `.claude` hits are inside the vendored
third-party skill `ui-ux-pro-max` (its data tables and its own scripts). None of
those files are project source, none were touched in phase 2b, and none reach
the UI. Informational only, see finding 7.

The legacy emoji in the prototype UI were correctly replaced by lucide icons:
the dice emoji plus `สุ่ม` became `<Dices />` plus `สุ่ม`, and the arrow
character plus `ไปกรอกคะแนน` became `<ArrowRight />` plus `ไปกรอกคะแนน`.

### 1.5 No Firebase writes in this phase (focus point 1)

```
$ grep -rn "^import|from \"" src/components/RoundSetup.tsx src/components/RoundPlayerSelect.tsx src/components/MultiplierPicker.tsx
src/components/RoundSetup.tsx:8:import { useState } from "react";
src/components/RoundSetup.tsx:9:import { ArrowRight, Play } from "lucide-react";
src/components/RoundSetup.tsx:10:import { MULTIPLIERS, MultiplierPicker } from "@/components/MultiplierPicker";
src/components/RoundSetup.tsx:11:import { RoundPlayerSelect } from "@/components/RoundPlayerSelect";
src/components/RoundPlayerSelect.tsx:7:import { Check, Loader2, TriangleAlert } from "lucide-react";
src/components/RoundPlayerSelect.tsx:8:import { usePlayers } from "@/hooks/usePlayers";
src/components/RoundPlayerSelect.tsx:9:import type { Player } from "@/types/models";
src/components/MultiplierPicker.tsx:7:import { Dices } from "lucide-react";

$ grep -rnE "firebase|database|DB_PATHS|set\(|update\(|push\(|runTransaction|remove\(" src/components/RoundSetup.tsx src/components/RoundPlayerSelect.tsx src/components/MultiplierPicker.tsx
EXIT=1
```

Confirmed: no import from `@/lib/players`, no `firebase/database` import, and no
`set` / `update` / `push` / `runTransaction` / `remove` call anywhere in the
three new components. The only Firebase touch is the read-only listener behind
`usePlayers` -> `subscribeToList` (`src/lib/rtdb.ts:31`), which returns the
`onValue` unsubscribe and is cleaned up on unmount in
`src/hooks/usePlayers.ts:32`.

### 1.6 Theme tokens, no hardcoded colours

```
$ grep -rnE "#[0-9a-fA-F]{3,8}" src/components/RoundSetup.tsx src/components/RoundPlayerSelect.tsx src/components/MultiplierPicker.tsx
EXIT=1
```

Every class used (`bg-surface`, `bg-surface-raised`, `border-border`,
`border-border-strong`, `bg-accent`, `bg-accent-strong`, `text-on-accent`,
`text-text-muted`, `text-danger`, `bg-bg`, `shadow-card`) resolves to a token
declared in `src/app/globals.css:9-61`.

### 1.7 Legacy parity evidence

Multiplier ladder and randomiser, `reference/legacy-prototype.html:629-637`:

```js
function randomMultiplier() {
    const multipliers = [1, 2, 4, 5, 8, 10, 20];
    const randomIndex = Math.floor(Math.random() * multipliers.length);
    const selectEl = document.getElementById('multiplier');
    selectEl.value = multipliers[randomIndex];
    ...
    currentRoundIsRandom = true;
}
```

`src/components/MultiplierPicker.tsx:10`:

```ts
export const MULTIPLIERS = [1, 2, 4, 5, 8, 10, 20] as const;
```

`src/components/RoundSetup.tsx:36-40`:

```ts
function randomizeMultiplier() {
  const next = MULTIPLIERS[Math.floor(Math.random() * MULTIPLIERS.length)];
  setMultiplier(next);
  setIsRandom(true);
}
```

Order, values, index formula and the "this round was randomised" mark all match.
The default value is x1, matching the legacy first/selected option
`<option value="1">x1 (ปกติ)</option>` at `reference/legacy-prototype.html:293`.

Explicit pick clears the random mark. Legacy
`reference/legacy-prototype.html:292`:

```html
<select id="multiplier" ... onchange="currentRoundIsRandom = false;">
```

`src/components/RoundSetup.tsx:29-34`:

```ts
function pickMultiplier(value: number) {
  setMultiplier(value);
  setIsRandom(false);
}
```

Matches. One deliberate behavioural difference: re-picking the value the
randomiser already produced fires `onChange` in the new chip UI and clears
`isRandom`, whereas a native `select` fires no `onchange` when the value does
not change. The new behaviour is the intended reading of the rule (an explicit
pick is not random) and is accepted.

Minimum-two-players guard. Legacy `reference/legacy-prototype.html:695`:

```js
function setupScoreInput() {
    if (selectedPlayerIds.length < 2) return alert('ต้องมีผู้เล่นอย่างน้อย 2 คนขึ้นไปเพื่อคำนวณผลต่างครับ');
```

`src/components/RoundSetup.tsx:14,42,78`:

```ts
const MIN_PLAYERS = 2;
const enoughPlayers = selectedIds.length >= MIN_PLAYERS;
disabled={!enoughPlayers}
```

The threshold is right, but the operand it counts is not always right. See
finding 1.

Toggle behaviour. Legacy `reference/legacy-prototype.html:622-627` splices the
id out or pushes it; `src/components/RoundSetup.tsx:21-27` filters or appends
immutably. Same result, and first-selection order is preserved in both.

### 1.8 Firebase data shape (unchanged this phase, re-verified)

Legacy player write, `reference/legacy-prototype.html`:

```js
players.push({ id: Date.now().toString(), name: name, image: base64Data, totalScore: 0, latestScore: null });
```

`src/types/models.ts:4-13`:

```ts
export interface Player {
  id: string;
  name: string;
  image: string;
  totalScore: number;
  latestScore: number | null;
}
```

Match. `Group` (`src/types/models.ts:15-20`: `id`, `name`,
`playerIds: string[]`, `scores: Record<string, number>`) and `HistoryEntry`
(`src/types/models.ts:22-33`: `id`, `timestamp: string`, `groupName`, `groupId`,
`multiplier`, `playerScores: Record<string, number>`, `commentary`) are
unchanged and still match the legacy writes (history object at
`reference/legacy-prototype.html:956` writes `multiplier: tempMultiplier`).

Paths resolve correctly, `src/lib/firebase.ts:30-35`:

```ts
const RTDB_ROOT = process.env.NEXT_PUBLIC_RTDB_ROOT || "dummyRoom";
export const DB_PATHS = {
  players: `${RTDB_ROOT}/players`,
  groups: `${RTDB_ROOT}/groups`,
  history: `${RTDB_ROOT}/history`,
```

With `NEXT_PUBLIC_RTDB_ROOT` unset or set to `dummyRoom` these are
`dummyRoom/players`, `dummyRoom/groups`, `dummyRoom/history`.
`src/lib/players.ts:11-13` still writes the whole array via `set(...)`, so the
array shape the phase-2 transaction depends on is intact. Phase 2b adds no
model change and no path change.

---

## 2. Findings

1. **BLOCKER - `src/components/RoundSetup.tsx:17,42,73` - stale selection after a
   player is deleted breaks the minimum-2 guard.**
   `selectedIds` is never reconciled with the live roster. `RoundSetup` and the
   roster sit on the same screen (`src/app/page.tsx:45,56`), and `PlayerList`
   can delete a player (`src/components/PlayerList.tsx:83` -> `deletePlayer` ->
   `src/lib/players.ts:58-61`, which removes the player from the array).
   Reproduce: select 2 players, scroll down, delete one of them. The grid drops
   that row, but `selectedIds` still holds the dead id, so the summary shows
   `เลือกแล้ว 2 คน` and `ไปกรอกคะแนน` stays enabled with only one live player
   selected - exactly the case the legacy guard exists to prevent. The prototype
   prunes explicitly at `reference/legacy-prototype.html:1634`:
   `selectedPlayerIds = selectedPlayerIds.filter(selectedId => selectedId !== id);`
   and re-filters against `players` in `playLastGroupAgain` / `playThisGroup`
   (lines 660-686). Left as is, phase 2c will carry a ghost player id into score
   entry and into `playerScores` on the history write.
   Fix: give `RoundSetup` the roster and derive the valid selection. Lift
   `usePlayers` to `src/app/page.tsx` (it already calls it at line 13), pass
   `players` into `RoundSetup` and on into `RoundPlayerSelect` as a prop (the
   pattern `PlayerList` already uses), then compute
   `const validSelectedIds = selectedIds.filter((id) => players.some((p) => p.id === id));`
   and use `validSelectedIds` for the counter, for the `>= MIN_PLAYERS` check,
   and as the value handed to phase 2c.

2. **MEDIUM - `src/app/page.tsx:13` and `src/components/RoundPlayerSelect.tsx:39`
   - duplicate live subscription to `dummyRoom/players`.**
   Two independent `usePlayers()` calls mount two `onValue` listeners on the
   same path for a single screen. Both unsubscribe correctly, so this is not a
   leak, but it is a redundant listener and an extra render path, and it is
   inconsistent with `PlayerList`, which receives `players` as a prop from the
   page. It is also the root cause of finding 1: `RoundSetup` cannot see the
   roster it is selecting from.
   Fix: same change as finding 1. Keep the single page-level `usePlayers()` and
   pass `players` down; `RoundPlayerSelect` becomes
   `{ players, selectedIds, onToggle }` and stops calling the hook. Its loading
   and error branches move to the page, which already holds that state.

3. **MINOR - `src/components/RoundPlayerSelect.tsx:11-30` duplicates the `Avatar`
   component from `src/components/PlayerList.tsx:12-31`.**
   The two are identical except for `size-10` vs `size-11` and `text-base` vs
   `text-lg`. Two copies of the same fallback-initial logic will drift.
   Fix: move it to one `src/components/PlayerAvatar.tsx` taking
   `{ player, size }`, or settle on a single shared size. Non-blocking, but
   cheap to do while this file is being touched for finding 1.

4. **MINOR - `src/components/RoundPlayerSelect.tsx:68` - two-column grid squeezes
   names on small phones.**
   `grid-cols-2 ... sm:grid-cols-3` at a 320px viewport leaves about 100px of
   content per cell; the 40px avatar and the 20px check badge consume 76px of
   it, so the name gets roughly 24px and truncates to one or two characters.
   Nothing overflows and there are no fixed pixel widths, so this is cosmetic,
   but the picker is the one place a name must stay readable.
   Fix: start at one column and step up, for example
   `grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3`, or use `size-8` for the
   avatar in this component.

5. **INFO - `src/components/RoundSetup.tsx:44-47` - `handleProceed` is an empty
   handler, so the enabled button visibly does nothing.**
   This matches the phase brief (TODO stub for phase 2c) and the comment names
   the follow-up, so it is accepted as scoped. Flagged only so it is not
   forgotten: as soon as two players are selected, the primary call to action is
   live and silent. No fix required in 2b.

6. **INFO - round state is shaped correctly for phase 2c (focus point 3).**
   `selectedIds: string[]`, `multiplier: number` and `isRandom: boolean` live in
   one owner (`src/components/RoundSetup.tsx:17-19`) and map straight onto what
   the legacy round needs: `selectedPlayerIds`, `tempMultiplier`
   (`reference/legacy-prototype.html:766`, written to history as `multiplier` at
   line 956) and `currentRoundIsRandom` (line 977, persisted as
   `dummimie_lastWasRandom`). Nothing needs lifting or reshaping in 2c beyond
   the pruning in finding 1. No speculative abstraction, no dead config, no
   unused exports - `MULTIPLIERS` is exported and consumed by `RoundSetup`.

7. **INFO - emoji found under `.claude/skills/ui-ux-pro-max/`.**
   Vendored third-party skill data and scripts, untouched by this phase and not
   part of the product surface. Project source (`src`), `CLAUDE.md` and all
   phase 2b files are emoji-free. No action needed for hand-off; if the rule is
   to be enforced repo-wide, exclude the vendored skill directory from the scan
   rather than editing upstream files.

### Checklist summary

| Item | Result |
| --- | --- |
| Build (`npm run build`) | Pass, no errors |
| No `any` | Pass, grep empty |
| No emoji in `src` and `CLAUDE.md` | Pass |
| Icons from lucide-react | Pass (`Play`, `ArrowRight`, `Dices`, `Check`, `Loader2`, `TriangleAlert`) |
| Thai UI text, English comments | Pass |
| Theme tokens, no raw hex | Pass |
| No Firebase writes this phase | Pass |
| Data shape and RTDB paths | Pass, unchanged |
| Legacy parity: ladder, randomise, random-mark clearing, toggle | Pass |
| Minimum-2-players rule | Fail, finding 1 |
| Responsive | Pass with a nit, finding 4 |
| Over-engineering | Pass, duplication nit in finding 3 |
| Subscription cleanup | Pass, but redundant listener, finding 2 |

Findings 1 and 2 must be fixed before hand-off. Findings 3 and 4 are
recommended in the same pass. Findings 5 to 7 are informational.

Round 1 verdict: NOT PASSED

---

## 3. Round 2 - re-review after fixes

Files changed since round 1:

```
$ git status --short
 M .gitignore
 M src/app/page.tsx
 M src/components/PlayerList.tsx
?? reports/review-phase-2b.md
?? src/components/MultiplierPicker.tsx
?? src/components/PlayerAvatar.tsx
?? src/components/RoundPlayerSelect.tsx
?? src/components/RoundSetup.tsx
```

### 3.1 Build (fresh run, round 2)

```
$ npm run build

> cosmo999@0.1.0 build
> next build

   Next.js 15.5.24
   - Environments: .env.local

   Creating an optimized production build ...
 Compiled successfully in 2.7s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/5) ...
   Generating static pages (1/5)
   Generating static pages (2/5)
   Generating static pages (3/5)
 Generating static pages (5/5)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
/                                        52.8 kB         155 kB
/icon.svg                                    0 B            0 B
/_not-found                                993 B         104 kB
+ First Load JS shared by all             103 kB
  chunks/255-c5a697ddbf82d774.js         46.4 kB
  chunks/4bd1b696-c023c6e3521b1417.js    54.2 kB
  other shared chunks (total)            1.97 kB

(Static)  prerendered as static content
```

No errors, no type or lint failures.

### 3.2 Round-2 greps

```
$ grep -rnE ": any|as any|<any>|any\[\]" src
EXIT_any=1

$ grep -rnE "firebase|database|DB_PATHS|usePlayers|set\(|update\(|push\(|runTransaction|remove\(" src/components/RoundSetup.tsx src/components/RoundPlayerSelect.tsx src/components/MultiplierPicker.tsx src/components/PlayerAvatar.tsx
EXIT_writes=1

$ grep -rnE "#[0-9a-fA-F]{3,8}" src/components/RoundSetup.tsx src/components/RoundPlayerSelect.tsx src/components/MultiplierPicker.tsx src/components/PlayerAvatar.tsx
EXIT_hex=1

$ grep -rn "usePlayers(" src
src/app/page.tsx:13:  const { players, loading, error } = usePlayers();
src/hooks/usePlayers.ts:9:export function usePlayers(): {

$ export LC_ALL=en_US.UTF-8
$ grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src
EXIT_src=1
$ grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" CLAUDE.md
EXIT_claudemd=1
```

The new `PlayerAvatar.tsx` is covered by all of the above and is clean. The only
`usePlayers()` call site in the app is now `src/app/page.tsx:13`.

### 3.3 Verification of each round-1 finding

**Finding 1 (BLOCKER, stale selection) - FIXED.**
`src/components/RoundSetup.tsx:48-54`:

```ts
// Ignore ids whose player was deleted from the roster below while still
// selected, so the counter and the min-players guard never count someone
// who is gone. Legacy prunes the same way on delete and on group replay.
const validSelectedIds = selectedIds.filter((id) =>
  players.some((player) => player.id === id),
);
const enoughPlayers = validSelectedIds.length >= MIN_PLAYERS;
```

`validSelectedIds` now feeds the counter (line 90), the disabled state (line 95
via `enoughPlayers`), the grid's `selectedIds` prop (line 73) and the phase-2c
TODO (line 57). Deleting a selected player from the roster below now drops the
count and re-disables `ไปกรอกคะแนน`, matching the legacy prune at
`reference/legacy-prototype.html:1634` and the guard at line 695. Deriving the
valid list on render instead of pruning state in an effect is the better call
here: a momentary empty snapshot from the listener does not destroy the user
selection, it returns when the roster returns.

**Finding 2 (MEDIUM, duplicate subscription) - FIXED.**
`src/components/RoundPlayerSelect.tsx:6-20` no longer imports `usePlayers`; its
props are `{ players, loading, selectedIds, onToggle }`. `src/app/page.tsx:45`
passes `players` and `loading` into `RoundSetup`, which forwards them
(`RoundSetup.tsx:70-75`). The grep above confirms one `usePlayers()` call for
the screen, so one `onValue` listener on `dummyRoom/players`, still detached at
`src/hooks/usePlayers.ts:32`. The prop-list deviation from the original task
brief is exactly what this review asked for and matches the `PlayerList`
pattern; accepted.

**Finding 3 (MINOR, duplicate Avatar) - FIXED.**
`src/components/PlayerAvatar.tsx` holds the single implementation, sizing passed
in by the caller (`className`, default `"size-11 text-lg"`).
`git diff src/components/PlayerList.tsx` shows the local `Avatar` deleted and
`<PlayerAvatar player={player} />` used with the default sizing, so the roster
row renders exactly as before; `RoundPlayerSelect.tsx:54` passes
`"size-10 text-base"`. No behaviour change, one copy of the initial-fallback
logic.

**Finding 4 (MINOR, tight grid) - FIXED and verified in the emitted CSS.**
`src/components/RoundPlayerSelect.tsx:39`:

```
<ul className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-3">
```

Phones under 400px get one full-width row per player, so names no longer
truncate to a character or two. The arbitrary variant really compiled:

```
$ grep -o "min-width: *400px" .next/static/css/*.css | head -3
min-width:400px
```

### 3.4 Re-checked, unchanged and still correct

- No Firebase writes in any phase 2b component (grep in 3.2, exit 1); the only
  data access on the screen is the read-only page-level listener.
- `MULTIPLIERS = [1, 2, 4, 5, 8, 10, 20] as const`
  (`src/components/MultiplierPicker.tsx:10`) still matches
  `const multipliers = [1, 2, 4, 5, 8, 10, 20];`
  (`reference/legacy-prototype.html:630`), same index formula
  (`RoundSetup.tsx:43` vs prototype line 631), `setIsRandom(true)` on randomise
  (line 636), `setIsRandom(false)` on an explicit pick
  (`onchange="currentRoundIsRandom = false;"`, line 292), default x1.
- Models and RTDB paths untouched this phase: `src/types/models.ts:4-33` still
  matches the legacy player, group and history writes, and
  `src/lib/firebase.ts:30-35` still resolves to `dummyRoom/players`,
  `dummyRoom/groups`, `dummyRoom/history`. `src/lib/players.ts:11-13` still
  writes whole arrays via `set(...)`.
- Thai UI text, English-only comments, lucide icons only, every colour from a
  `globals.css` token.

### 3.5 Remaining observations (informational, none blocking)

8. **INFO - `src/components/RoundPlayerSelect.tsx:30-36` - the empty-state text
   also shows when the listener errors.** The component's old error branch went
   away with the hook. On a listener failure `usePlayers` reports
   `loading: false` and `players: []`, so the grid renders
   `ยังไม่มีผู้เล่น สร้างโปรไฟล์ก่อนเริ่มเกม` even though the real cause is a
   failed load. The user is not left in the dark: the header badge shows
   `หลุดการเชื่อมต่อ` in the danger colour (`src/app/page.tsx:26-30`), and
   `PlayerList` has behaved this way since phase 2a, so the screen is
   consistent. Optional cheap fix if it ever matters: pass the page-level
   `error` down and keep an explicit error line. Not required for hand-off.
9. **INFO - `src/components/RoundSetup.tsx:56-59`** `handleProceed` is still the
   intentional empty stub for phase 2c, now correctly naming `validSelectedIds`
   in its TODO. In scope for 2b.
10. **INFO - emoji still present only under `.claude/skills/ui-ux-pro-max/`**
    (vendored third-party skill, untouched by this phase). `src` and `CLAUDE.md`
    are clean.

### Round-2 checklist summary

| Item | Result |
| --- | --- |
| Build (`npm run build`, run in this review) | Pass, no errors |
| No `any` | Pass, grep empty |
| No emoji in `src` and `CLAUDE.md` | Pass |
| Icons from lucide-react | Pass |
| Thai UI text, English comments | Pass |
| Theme tokens, no raw hex | Pass |
| No Firebase writes this phase | Pass |
| Data shape and RTDB paths | Pass, unchanged |
| Legacy parity: ladder, randomise, random-mark clearing, toggle, prune-on-delete | Pass |
| Minimum-2-players rule | Pass, now counts `validSelectedIds` |
| Responsive, 320px to iPad | Pass, 1 / 2 / 3 columns, 400px breakpoint verified in emitted CSS |
| Over-engineering | Pass, one shared `PlayerAvatar`, no dead code |
| Subscription cleanup and count | Pass, single listener, detached on unmount |
| Round state ready for phase 2c | Pass, `validSelectedIds` / `multiplier` / `isRandom` |

All round-1 blocking and medium findings are fixed and verified against the
prototype and against a build run in this review. The three remaining items are
informational.

PASSED
