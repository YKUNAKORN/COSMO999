# Review - Phase 2d (atomic round save, roast commentary, confetti) - RE-REVIEW

Branch: `claude/atomic-save-confetti-roast-hu2efq`
Commit under review: `1df0b55` "Fix code-reviewer findings on phase 2d round save"
Previous review: same file, commit `c703af7`, verdict NOT PASSED (3 findings)
Ground truth: `reference/legacy-prototype.sanitized.html`

Files re-read in full this pass: `src/lib/rounds.ts`, `src/lib/commentary.ts`,
`src/lib/scoring.ts`, `src/lib/firebase.ts`, `src/lib/rtdb.ts`,
`src/types/models.ts`, `src/components/ScoreEntry.tsx`,
`src/components/PreviewDialog.tsx`, `src/components/RoundSetup.tsx`,
`src/hooks/useHistory.ts`, plus `node_modules/@firebase/database/dist/public.d.ts`
and `index.node.cjs.js` for the `runTransaction` contract.

---

## 1. Commands run and real output

### 1.1 `npm run build`

```
> cosmo999@0.1.0 build
> next build

   ▲ Next.js 15.5.24

   Creating an optimized production build ...
 [ok] Compiled successfully in 1942ms
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/9) ...
   Generating static pages (2/9)
   Generating static pages (4/9)
   Generating static pages (6/9)
 [ok] Generating static pages (9/9)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                    57.5 kB         160 kB
├ ○ /_not-found                            993 B         104 kB
├ ○ /groups                                806 B         103 kB
├ ○ /history                               806 B         103 kB
├ ○ /icon.svg                                0 B            0 B
├ ○ /leaderboard                           806 B         103 kB
└ ○ /stats                                 806 B         103 kB
+ First Load JS shared by all             103 kB
  ├ chunks/255-c5a697ddbf82d774.js       46.4 kB
  ├ chunks/4bd1b696-c023c6e3521b1417.js  54.2 kB
  └ other shared chunks (total)          1.96 kB

○  (Static)  prerendered as static content
```

Build finished with no errors in this review. (Next.js prints a U+2713 check
glyph on the "Compiled" / "Generating static pages" lines; transcribed here as
`[ok]` so this report stays clean under the repo emoji scan.)

### 1.2 `npx tsc --noEmit`

```
tsc exit: 0
```

(no diagnostics printed)

### 1.3 `npm run lint`

```
> cosmo999@0.1.0 lint
> eslint
```

(no output, no warnings)

### 1.4 `grep -rnE ": any|as any|<any>|any\[\]" src`

```
exit=1
```

Empty output - pass. Widened `grep -rnE "\bany\b" src` returns only two English
prose comments, no type usage:

```
src/types/models.ts:10:  // player who has not been scored in any round yet. Keep the null - code must
src/lib/rounds.ts:27:// as `unknown`, previously `any` in the v8 API this was ported from). This is
```

### 1.5 Emoji scan

```
LC_ALL=C.UTF-8 grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src .claude/agents CLAUDE.md reports
exit=1
```

Empty output - pass. A widened run also covering `\x{2190}-\x{21FF}`,
`\x{2300}-\x{23FF}`, `\x{2460}-\x{27BF}` and `\x{1FA00}-\x{1FAFF}` over
`src .claude/agents CLAUDE.md` is also empty (`exit=1`). Both commit messages in
this phase were checked with `git log -2 --format='%H%n%s%n%b'` and contain no
emoji.

### 1.6 Literal `dummyRoom` in `src`

```
src/types/models.ts:37:// array - matching the legacy dummyRoom/history structure exactly.
src/hooks/useGroups.ts:3:// Live list of groups from dummyRoom/groups. Read-only.
src/hooks/usePlayers.ts:3:// Live list of players from dummyRoom/players. Read-only.
src/hooks/useHistory.ts:3:// Live list of match history from dummyRoom/history. Read-only.
src/lib/rtdb.ts:6:// Legacy quirk: dummyRoom/players and dummyRoom/groups were saved as JSON
src/lib/rtdb.ts:8:// deleted slots come back as null. dummyRoom/history is an object keyed by
src/lib/firebase.ts:23:// RTDB paths. The root defaults to "dummyRoom" - the legacy production
src/lib/firebase.ts:25:// NEXT_PUBLIC_RTDB_ROOT to something like "dummyRoom_dev" while testing
src/lib/firebase.ts:30:const RTDB_ROOT = process.env.NEXT_PUBLIC_RTDB_ROOT || "dummyRoom";
src/lib/firebase.ts:34:  // (never a hardcoded "dummyRoom") so it honours NEXT_PUBLIC_RTDB_ROOT too.
src/lib/players.ts:1:// Player writes. dummyRoom/players is stored as a whole JSON array, exactly
```

Only comments plus the single env fallback at `src/lib/firebase.ts:30`. The
transaction targets `DB_PATHS.root` (`src/lib/rounds.ts:118`). With
`NEXT_PUBLIC_RTDB_ROOT` unset or `dummyRoom` the paths resolve to `dummyRoom`,
`dummyRoom/players`, `dummyRoom/groups`, `dummyRoom/history`
(`src/lib/firebase.ts:32-39`), matching the legacy refs at sanitized L517-519
and L909 `db.ref('dummyRoom').transaction(...)`.

### 1.7 `alert(` / `confirm(` / `prompt(`

```
grep -rnE "\b(alert|confirm|prompt)\s*\(" src
exit=1
```

Empty output. The legacy `alert()` calls (sanitized L903 zero-sum, L964 save
failure) are inline Thai `role="alert"` paragraphs at
`src/components/ScoreEntry.tsx:213-220` and
`src/components/PreviewDialog.tsx:142-149`.

### 1.8 Hardcoded hex colours in `src/**/*.ts(x)`

```
grep -rnE "#[0-9a-fA-F]{3,8}\b" src --include=*.tsx --include=*.ts
exit=1
```

Empty output - semantic tokens only.

### 1.9 `runTransaction` / `TransactionOptions` contract (installed `firebase@12`)

`node_modules/@firebase/database/dist/public.d.ts:1577-1586`:

```ts
/** An options object to configure transactions. */
export declare interface TransactionOptions {
  /**
   * By default, events are raised each time the transaction update function
   * runs. So if it is run multiple times, you may see intermediate states. You
   * can set this to false to suppress these intermediate states and instead
   * wait until the transaction has completed before events are raised.
   */
  readonly applyLocally?: boolean;
}
```

`node_modules/@firebase/database/dist/public.d.ts:1411-1418`:

```ts
export declare function runTransaction(
  ref: DatabaseReference,
  transactionUpdate: (currentData: any) => unknown,
  options?: TransactionOptions
): Promise<TransactionResult>;
```

Default confirmed at `node_modules/@firebase/database/dist/index.node.cjs.js:13912`:

```js
const applyLocally = options?.applyLocally ?? true;
```

So `{ applyLocally: false }` is a real, typed, optional third argument on this
project's installed SDK, and it is the exact knob for the defect reported last
round. (The `any` in that signature is third-party declaration text, not repo
code; our updater is declared `(currentData: unknown)` at
`src/lib/rounds.ts:119`.)

---

## 2. Verification of the three prior findings

### Prior finding 1 - optimistic first pass flashed an empty room. FIXED.

`src/lib/rounds.ts:117-129` now passes the options object:

```ts
const result = await runTransaction(
  ref(database, DB_PATHS.root),
  (currentData: unknown) => applyRound(normalizeRoom(currentData), args),
  { applyLocally: false },
);
```

With `applyLocally: false` the SDK still runs the updater on the null first pass
(`repoGetLatestState` -> `syncTreeCalcCompleteEventCache` finds no complete
cache at the room root because the only listeners are on its
players/groups/history children, same file L11345-11350 and L9836-9847), but the
resulting value is applied as a hidden write and no events are raised for it
(`syncTreeApplyUserOverwrite(..., transaction.applyLocally)` at L11340). The
write itself is unchanged: the transaction still ships the value plus the hash
of the data it was computed from, the server rejects the stale hash, and the
updater re-runs against real server data before committing. No blank-roster
flash. `normalizeRoom`'s null handling (L33-46) is untouched and still correct -
returning `undefined` there would abort a legitimate write.

The explanatory comment at L120-127 is accurate and matches the SDK behaviour
quoted above.

### Prior finding 2 - dropped legacy `|| 0` on `totalScore`. FIXED.

Legacy (sanitized L918):

```js
safePlayers[pIndex].totalScore = (safePlayers[pIndex].totalScore || 0) + finalScore;
```

Port (`src/lib/rounds.ts:64`):

```ts
totalScore: (players[index].totalScore ?? 0) + net,
```

`??` rather than `||` is the correct choice here and is a strict improvement:
legacy's `|| 0` also rewrites a legitimate `0` to `0` (harmless), while `??`
only substitutes for `null`/`undefined`. A row read back from RTDB without the
field can no longer produce `NaN` and fail `validateFirebaseData`. `latestScore:
net` on the next line still matches sanitized L919.

### Prior finding 3 - dead `SaveRoundResult.room`. FIXED.

`src/lib/rounds.ts:22-24` is now `export interface SaveRoundResult { committed: boolean; }`,
and `saveRound` returns `{ committed: result.committed }` (L130) / `{ committed: false }`
(L132). The second `normalizeRoom` call on the committed snapshot is gone. The
`RoomData` import at L9 is still required (`normalizeRoom` and `applyRound`
signatures), confirmed by a clean `tsc --noEmit` and `eslint` with
`no-unused-vars` active. Sole call site `src/components/ScoreEntry.tsx:121-128`
reads only `outcome.committed`.

No new problems introduced by any of the three edits.

---

## 3. Fresh full pass over the rest of phase 2d

### 3.1 Model shapes vs ground truth

`src/types/models.ts:4-33` vs the legacy writes:

- `Player.latestScore: number | null` (models.ts:12) vs sanitized L919
  `safePlayers[pIndex].latestScore = finalScore;` and the legacy add-player
  write which seeds it as `null` - match.
- `HistoryEntry.timestamp: string` (models.ts:27) vs sanitized L954
  `timestamp: new Date().toISOString(),` - match, ISO string not epoch.
- `Group { id, name, playerIds, scores }` (models.ts:15-20) vs sanitized L939
  `safeGroups.push({ id: groupIdStr, name: groupNameCombined, playerIds: currentIds, scores: initialScores });`
  - match, field for field.

`RoomData` (models.ts:38-42) is `players: Player[]; groups: Group[];
history: Record<string, HistoryEntry>`, i.e. players/groups arrays and history
keyed, exactly the legacy layout:

- sanitized L924 `currentData.players = safePlayers;` (array)
- sanitized L947 `currentData.groups = safeGroups;` (array)
- sanitized L950-951 `if (!currentData.history) currentData.history = {};`
  `const matchId = Date.now().toString();`

`src/lib/rounds.ts:102-106` returns `players` and `groups` as JS arrays and
`history` as an object keyed by `matchId` (L91, L105). No keyed-object
conversion of players/groups anywhere in `src` - the array shape the phase-2
transaction logic depends on is preserved.

### 3.2 `confirmAndSaveRound` (sanitized L889-993) vs `src/lib/rounds.ts`

| Legacy | Port | Verdict |
| --- | --- | --- |
| L910 `if (!currentData) return currentData;` | `normalizeRoom` L34-46 -> empty room | intentional, documented deviation; returning `undefined` on the v9 optimistic pass would abort a valid write |
| L913 `Array.isArray(...) ? ... : Object.values(...)` | `normalizeList` (`src/lib/rtdb.ts:14-25`) | equivalent, also drops array holes |
| L916-920 `pIndex > -1` guard, `totalScore` with `|| 0`, `latestScore` | L52-68 | matches |
| L929-930 sorted ids joined with `_` | L71-72 | matches |
| L933-941 new group: zeroed scores, names joined `" + "`, `playerIds` = sorted ids | L75-83 | matches (`'Unknown'` -> Thai `ไม่ทราบชื่อ`, correct for a Thai UI) |
| L943-946 `scores[id] = (scores[id] \|\| 0) + net` over the unsorted selection | L86-88 (`?? 0`) | matches |
| L950-960 history keyed by `Date.now().toString()`, ISO timestamp, `groupName` from the possibly-just-created group, `multiplier`, `playerScores`, `commentary` | L91-106 | matches field for field |
| L963-969 failure -> `alert` | `committed:false` -> inline Thai error | matches intent, no `alert` |
| L970-972 `if (tempHasPositive) confetti({particleCount:150, spread:80, origin:{y:0.6}, zIndex:9999})` | `ScoreEntry.tsx:20-24, 136` | same parameters, plus a `prefers-reduced-motion` guard and a dynamic `import("canvas-confetti")`; that import is the only `canvas-confetti` reference in `src` |
| L977-984 reset: selection cleared, multiplier back to 1, random flag cleared | `RoundSetup.resetRound` (`src/components/RoundSetup.tsx:77-83`) | matches; the `localStorage` bits are out of scope for this phase |

Zero-sum guard: legacy re-checks `tempTotalNetScore !== 0` inside
`confirmAndSaveRound` (L902). The port checks it once in `handleCheck`
(`ScoreEntry.tsx:104-109`) and only then sets `checked`, which is the sole and
immutable input to `handleConfirm` - the invariant still holds.

Retry after a failed save regenerates the commentary (a fresh
`generateRoundCommentary` call per `handleConfirm`), which is what the legacy
does too (L906 runs per invocation).

Room-root rebuild: the port returns a freshly built `{ players, groups, history }`
rather than mutating `currentData`, so an unknown fourth child of `dummyRoom`
would be dropped. Grepping the ground truth for every `dummyRoom` reference
(sanitized L517-519, L909, L1055, L1114-1115) shows only `players`, `groups` and
`history` ever exist, so nothing is lost. Noted, not a defect.

### 3.3 `generateRoundCommentary` (sanitized L816-884) vs `src/lib/commentary.ts`

- `ROAST_CHANCE = 0.3` and `if (Math.random() > ROAST_CHANCE) return "";`:
  sanitized L820-826 vs commentary.ts:9, 25 - identical.
- min/max scan and winner/loser id collection: sanitized L828-837 vs L27-39 -
  identical semantics; ties keep the first id and `[0]` is used, as in legacy.
- name fallback `'ใครบางคน'`: sanitized L840-843 vs L11-13 - identical
  (legacy's `escapeHTML` is unnecessary - React escapes on render).
- comeback: sanitized L850-854
  `const sortedHist = [...matchHistory].sort((a, b) => b.id - a.id);` plus
  `prevScore !== undefined && prevScore < 0 && maxScore > 0`, vs L46-51
  `sort((a, b) => Number(b.id) - Number(a.id))` and the same three conditions -
  equivalent; the explicit `Number()` is the correct typed port of legacy's
  implicit numeric coercion of the `Date.now().toString()` id.
- thresholds `minScore <= -100` / `else if (minScore < 0)` and the empty-list
  `return ""`: sanitized L857-882 vs L64-83 - identical.
- All 13 roast strings are present, in the same order, with identical wording;
  each legacy leading emoji (U+1F9DF, U+1F691, U+1F92C, U+2728, U+1F3E0,
  U+1F436, U+26B0, U+1F4F1, U+1F3E7, U+1F9F1, U+1FA78, U+1F4B8, U+1F62D) is
  stripped and no other character was altered. Confirmed by the emoji scan in
  1.5 returning empty for `src/lib/commentary.ts`.
- The prior-history input is the live `useHistory()` list
  (`ScoreEntry.tsx:66, 119`), read before the save - what legacy's global
  `matchHistory` held at that moment.

### 3.4 `calculateRoundScores` (sanitized L745-761) vs `src/lib/scoring.ts:23-46`

Formula, the `|| 0` on both raw operands, the `totalNetScore` accumulation and
`hasPositive` all match. `parseScore` (`ScoreEntry.tsx:34-37`) matches legacy's
`parseInt(input.value) || 0`, including treating a lone `-` as 0.

### 3.5 Subscriptions, responsiveness, language, over-engineering

- `useHistory` returns its unsubscribe from the effect (`useHistory.ts:32`);
  `PreviewDialog`'s dialog effect closes the dialog on unmount
  (`PreviewDialog.tsx:54-56`). No leaked listeners; no listener is created
  inside the transaction path.
- Race conditions: `handleConfirm` is re-entrancy-guarded
  (`ScoreEntry.tsx:116`), both dialog buttons are `disabled={saving}`
  (`PreviewDialog.tsx:155, 164`) and `dismiss()` early-returns while saving
  (L67), so no double write and no unmount mid-flight.
- Responsive: `w-[min(28rem,calc(100vw-2rem))]` on the dialog
  (`PreviewDialog.tsx:85`), `flex-col gap-2 sm:flex-row-reverse` button rows
  (`PreviewDialog.tsx:151`, `ScoreEntry.tsx:222`), saved panel is a centred flex
  column with no fixed width (`ScoreEntry.tsx:143`). The only fixed widths are
  `w-24` (score input) and `w-16` (net column), both inside flex rows whose
  labels are `min-w-0 truncate`. No overflow at phone or iPad widths.
- Language: every new user-facing string is Thai; every new comment is English;
  icons are lucide (`ArrowLeft, ClipboardCheck, Flame, PartyPopper, RotateCcw,
  Check, X`).
- Over-engineering: with `SaveRoundResult.room` gone, `rounds.ts` is 134 lines
  with no speculative surface. `canvas-confetti` and `@types/canvas-confetti`
  are the only added dependencies and both are used. No dead code found.

---

## 4. Findings

### 1. `src/lib/scoring.ts:14-17` - stale comment now that phase 2d has landed (nit, non-blocking)

```
  // True when at least one player finished positive. This is an input for
  // phase 2d (it decides whether to fire the win confetti), not dead code -
  // phase 2c computes it but has no use for it yet.
```

`hasPositive` is now consumed at `src/components/ScoreEntry.tsx:136`, so the
"has no use for it yet" defence is obsolete. Fix when next touching the file:
reduce to a single line, e.g. `// True when at least one player finished
positive; ScoreEntry uses it to decide whether to fire the win confetti.` Does
not affect behaviour, types, build or the ground-truth match.

### 2. `src/components/PreviewDialog.tsx:8-9` - forward-looking phrasing now in the past (nit, non-blocking)

`"...touches no Firebase - the confirm button is the phase 2d seam."` The
statement is still factually true (the component takes `onConfirm` and does not
import Firebase), but the phrasing reads as pending work. Optional tidy:
`"...touches no Firebase - it reports confirm/cancel to ScoreEntry, which owns
the write."`

No blocking findings.

---

## 5. Summary

All three findings from the previous review are correctly fixed and none of the
fixes introduced a regression. `{ applyLocally: false }` is a real, typed option
on the installed `firebase@12` SDK with a documented default of `true`, so the
optimistic-broadcast flash is genuinely suppressed while the write semantics are
unchanged. `(players[index].totalScore ?? 0) + net` restores legacy's `|| 0`
robustness, and `SaveRoundResult` no longer carries an unread `room`.

The fresh pass over the rest of phase 2d found nothing else that shifted: build,
type-check and lint are clean; no `any`, no emoji anywhere including every roast
string in `src/lib/commentary.ts`, no `alert`/`confirm`/`prompt`, no hardcoded
`dummyRoom` in writing code, no raw hex; models match the legacy structure field
for field; `dummyRoom/players` and `dummyRoom/groups` stay arrays; the
transaction, the commentary generator and the scoring maths all match the
prototype; listeners are cleaned up; the layout is responsive; Thai UI with
English comments and lucide icons.

Only two stale-comment nits remain, neither of which changes behaviour or the
data contract.

PASSED
