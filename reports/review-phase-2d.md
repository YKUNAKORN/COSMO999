# Review - Phase 2d (atomic round save, roast commentary, confetti)

Branch: `claude/atomic-save-confetti-roast-hu2efq`
Commit under review: `c703af7` "Phase 2d: atomic round save, roast commentary, confetti"
Ground truth: `reference/legacy-prototype.sanitized.html`

Files read in full: `src/lib/rounds.ts`, `src/lib/commentary.ts`,
`src/lib/firebase.ts`, `src/lib/rtdb.ts`, `src/lib/scoring.ts`,
`src/types/models.ts`, `src/components/ScoreEntry.tsx`,
`src/components/PreviewDialog.tsx`, `src/components/RoundSetup.tsx`,
`src/hooks/useHistory.ts`, `src/app/page.tsx`, `package.json` diff.

---

## 1. Commands run and real output

### 1.1 `npm run build`

```
> cosmo999@0.1.0 build
> next build

   ▲ Next.js 15.5.24

   Creating an optimized production build ...
 [ok] Compiled successfully in 2.5s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/9) ...
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

Build finished with no errors. (Next.js prints a check-mark glyph on the
"Compiled"/"Generating static pages" lines; transcribed as `[ok]` here so this
report itself stays clean under the repo emoji scan.)

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

Empty output - pass. A broader word-boundary grep (`grep -rnE "\bany\b" src`) returns
only two English prose comments, no type usage:

```
src/types/models.ts:10:  // player who has not been scored in any round yet. Keep the null - code must
src/lib/rounds.ts:28:// as `unknown`, previously `any` in the v8 API this was ported from). This is
```

### 1.5 Emoji scan

```
LC_ALL=C.UTF-8 grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src .claude/agents CLAUDE.md reports
exit=1
```

Empty output - pass. A widened run that also covers `\x{2190}-\x{21FF}` and
`\x{2300}-\x{23FF}` (the legacy used U+23F3 HOURGLASS in the saving label) is
also empty. The commit message of `c703af7` was checked with
`git log -3 --format='%H%n%s%n%b'` and contains no emoji.

Line-by-line check of `src/lib/commentary.ts` against the legacy roast lines
(sanitized L836-882): all 13 strings are present, in the same order and with the
same wording; each legacy leading emoji (U+1F9DF, U+1F691, U+1F92C, U+2728,
U+1F3E0, U+1F436, U+26B0, U+1F4F1, U+1F3E7, U+1F9F1, U+1FA78, U+1F4B8, U+1F62D)
has been stripped and no other character was altered.

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
```

Only comments plus the single env fallback in `src/lib/firebase.ts:30`. The
transaction uses `DB_PATHS.root` (`src/lib/rounds.ts:115`). With
`NEXT_PUBLIC_RTDB_ROOT` unset or `dummyRoom` the paths resolve to
`dummyRoom`, `dummyRoom/players`, `dummyRoom/groups`, `dummyRoom/history`
(`src/lib/firebase.ts:32-39`), matching the legacy refs at sanitized
L517-519 and L909.

### 1.7 `alert(` / `confirm(` / `prompt(`

```
grep -rnE "\b(alert|confirm|prompt)\s*\(" src
```

Empty output. The legacy `alert()` calls (sanitized L903 zero-sum,
L964 save failure) are replaced by inline Thai `role="alert"` paragraphs at
`src/components/ScoreEntry.tsx:213-220` and
`src/components/PreviewDialog.tsx:142-149`.

### 1.8 Hardcoded hex colours in `src/**/*.ts(x)`

```
grep -rnE "#[0-9a-fA-F]{3,8}\b" src --include=*.tsx --include=*.ts
```

Empty output. New markup uses semantic tokens only (`bg-surface`, `text-accent`,
`border-danger`, `text-on-accent`, ...).

---

## 2. Ground-truth cross-check

### 2.1 Model shapes

`src/types/models.ts:4-33` matches the legacy writes field for field
(`Player.latestScore: number | null`, `HistoryEntry.timestamp: string` ISO).
The new `RoomData` (`src/types/models.ts:38-42`) is
`players: Player[]; groups: Group[]; history: Record<string, HistoryEntry>` -
players/groups arrays, history keyed, exactly the legacy layout:

- sanitized L924 `currentData.players = safePlayers;` (array)
- sanitized L947 `currentData.groups = safeGroups;` (array)
- sanitized L950-951 `if (!currentData.history) currentData.history = {};`
  `const matchId = Date.now().toString();`

`src/lib/rounds.ts:100-104` returns `players` and `groups` as JS arrays and
`history` as an object keyed by `matchId` (`src/lib/rounds.ts:89, 103`), so the
array shape the phase-2 transaction logic depends on is preserved. No keyed
object conversion anywhere.

### 2.2 `confirmAndSaveRound` (sanitized L889-993) vs `src/lib/rounds.ts`

| Legacy | Port | Verdict |
| --- | --- | --- |
| L910 `if (!currentData) return currentData;` | `normalizeRoom` L34-47 returns `{players:[],groups:[],history:{}}` | intentional and correct deviation: returning `undefined`/`null` on the v9 optimistic pass would abort a legitimate write |
| L913 `Array.isArray(...) ? ... : Object.values(...)` | `normalizeList` (`src/lib/rtdb.ts:14-25`) | equivalent, also drops array holes |
| L916-923 `pIndex > -1` guard, `totalScore + finalScore`, `latestScore = finalScore` | L53-66 | matches (see finding 3 for the dropped `|| 0`) |
| L929-930 sorted ids joined by `_` | L69-70 | matches |
| L935-941 new group: zeroed scores, names joined by `" + "`, `playerIds` = sorted ids | L73-81 | matches (`'Unknown'` -> Thai `ไม่ทราบชื่อ`, correct for a Thai UI) |
| L943-946 accumulate `scores[id] += net` over the unsorted selection | L83-87 | matches |
| L950-960 history entry keyed by `Date.now().toString()`, `timestamp` ISO, `groupName` from the (possibly just created) group, `multiplier`, `playerScores`, `commentary` | L89-104 | matches field for field |
| L963-969 failure -> `alert` | `saveRound` returns `committed:false`, caller shows inline Thai error | matches intent, no `alert` |
| L970-973 `if (tempHasPositive) confetti({particleCount:150, spread:80, origin:{y:0.6}, zIndex:9999})` | `src/components/ScoreEntry.tsx:20-24, 136` | same parameters, plus `prefers-reduced-motion` guard and dynamic `import("canvas-confetti")` (no module-scope import; verified by reading the file - the only `canvas-confetti` reference in `src` is the awaited dynamic import) |
| L977-984 reset: selection cleared, multiplier back to 1, random flag cleared | `RoundSetup.resetRound` (`src/components/RoundSetup.tsx:77-83`) | matches; `localStorage` bits are out of scope for this phase |

Zero-sum guard: the legacy re-checks `tempTotalNetScore !== 0` inside
`confirmAndSaveRound` (L902). The port checks it once in `handleCheck`
(`src/components/ScoreEntry.tsx:104-109`) and only then sets `checked`, which is
the exact and only input to `handleConfirm` and is immutable - the invariant
still holds, so this is fine.

### 2.3 `generateRoundCommentary` (sanitized L819-884) vs `src/lib/commentary.ts`

- `ROAST_CHANCE = 0.3` and the `Math.random() > ROAST_CHANCE` early return:
  sanitized L824-828 vs `src/lib/commentary.ts:9, 25` - identical.
- min/max scan and winner/loser id collection: sanitized L830-840 vs L27-39 -
  identical semantics (ties keep the first id, `[0]` is used).
- name fallback `'ใครบางคน'`: sanitized L844 vs L12 - identical (legacy's
  `escapeHTML` is unnecessary in React).
- comeback: sanitized L853-858
  `const sortedHist = [...matchHistory].sort((a, b) => b.id - a.id);` then
  `prevScore !== undefined && prevScore < 0 && maxScore > 0` vs L46-51
  `sort((a, b) => Number(b.id) - Number(a.id))` and the same three conditions -
  equivalent; the explicit `Number()` is the correct port of the legacy numeric
  coercion of the `Date.now().toString()` id.
- thresholds `minScore <= -100` / `else if (minScore < 0)` and the empty-list
  `return ""`: sanitized L861-884 vs L64-83 - identical.
- The prior-history input is the live `useHistory()` list
  (`src/components/ScoreEntry.tsx:66, 119`), read before the save, which is what
  the legacy global `matchHistory` held at that moment.

### 2.4 Subscription cleanup, responsiveness, language

- `useHistory` returns its unsubscribe from the effect (`src/hooks/useHistory.ts:32`);
  `PreviewDialog`'s dialog effect closes the dialog on unmount
  (`src/components/PreviewDialog.tsx:54-56`).
- Responsive: preview panel is `w-[min(28rem,calc(100vw-2rem))]`
  (`PreviewDialog.tsx:85`), button rows are `flex-col gap-2 sm:flex-row-reverse`
  (`PreviewDialog.tsx:151`, `ScoreEntry.tsx:222`), the saved panel is a centred
  flex column with no fixed width (`ScoreEntry.tsx:143`). No fixed pixel widths
  besides the `w-24` score input and `w-16` net column, both inside flex rows
  with `min-w-0 truncate` labels. No overflow risk found on phone or iPad widths.
- All new user-facing strings are Thai; all new comments are English; icons are
  `lucide-react` (`ArrowLeft, ClipboardCheck, Flame, PartyPopper, RotateCcw,
  Check, X`).

---

## 3. Findings

### 1. `src/lib/rounds.ts:115-117` - the optimistic first pass publishes an empty room to every local listener (must fix)

`runTransaction` is called without options, so `applyLocally` defaults to `true`
(verified in `node_modules/@firebase/database/dist/index.node.cjs.js:13912`
`const applyLocally = options?.applyLocally ?? true;`).

The app only holds listeners on `dummyRoom/players`, `dummyRoom/groups` and
`dummyRoom/history` - never on the room root. `repoStartTransaction` seeds the
first pass from `repoGetLatestState`, which is
`syncTreeCalcCompleteEventCache(...) || ChildrenNode.EMPTY_NODE` (same file,
L11345-11350), and `syncTreeCalcCompleteEventCache` (L9836-9847) only looks at
sync points **on the path** (ancestors), not at descendant listeners. There is no
complete cache at the root, so `currentState` is `EMPTY_NODE` and the updater is
called with `null` on the first pass - the exact case finding-proofed by
`normalizeRoom`. So far, correct.

The problem is what happens next: because `newVal !== undefined`, the SDK
immediately applies that optimistic value locally and raises events
(L11340-11341 `syncTreeApplyUserOverwrite(..., transaction.applyLocally)` then
`eventQueueRaiseEventsForChangedPath(...)`). The optimistic value is
`applyRound(emptyRoom, args)` = `{ players: [], groups: [one group whose name is
"ไม่ทราบชื่อ + ไม่ทราบชื่อ"], history: { <only the new entry> } }`. Every child
listener fires with it, so for one server round trip on every save the UI shows
zero players (`usePlayers` -> `PlayerList` and the "N คน" connection badge on
`src/app/page.tsx:42, 62`), a bogus "ไม่ทราบชื่อ" group, and a one-entry history.
The server then rejects the stale hash, the updater re-runs with real data and
the correct value replaces it - the stored data is never wrong, but the screen
is, on every single save, for as long as the round trip takes.

Fix: pass the options argument so the optimistic value is not broadcast, e.g.

```ts
const result = await runTransaction(
  ref(database, DB_PATHS.root),
  (currentData: unknown) => applyRound(normalizeRoom(currentData), args),
  // The updater sees null on the first local pass (no listener on the room
  // root), so the optimistic value would blank every list until the server
  // answers. Only raise events once the write is committed.
  { applyLocally: false },
);
```

Keep `normalizeRoom`'s null handling exactly as it is - that part is right.

### 2. `src/lib/rounds.ts:22-25, 120` - `SaveRoundResult.room` is dead API surface

`room` is computed with a second `normalizeRoom` call on the committed snapshot,
but no caller reads it (`grep -rn "saveRound" src` shows the only call site,
`src/components/ScoreEntry.tsx:121-126`, destructures nothing but `committed`).
That is speculative surface plus an unnecessary re-normalisation of the whole
room on every save, which CLAUDE.md's "do not over-engineer" rule rules out.

Fix: drop the `room` field (and the `RoomData` import if it becomes unused in
this file) and return `{ committed }`, or have `saveRound` return `boolean`.

### 3. `src/lib/rounds.ts:62` - dropped the legacy `|| 0` guard on `totalScore`

Legacy sanitized L918:

```js
safePlayers[pIndex].totalScore = (safePlayers[pIndex].totalScore || 0) + finalScore;
```

Port:

```ts
totalScore: players[index].totalScore + net,
```

`Player.totalScore` is typed `number`, but the value here comes from RTDB via the
documented cast in `normalizeList`, so the type is an assumption, not a
guarantee. A row missing `totalScore` yields `NaN`, and Firebase rejects `NaN`
in `validateFirebaseData`, which throws inside the transaction and turns the
whole save into `committed: false` - the failure mode the legacy `|| 0`
deliberately avoided.

Fix: `totalScore: (players[index].totalScore ?? 0) + net`.

### 4. `src/lib/rounds.ts:100-104` - the room is rebuilt rather than mutated (accepted, noted only)

The legacy mutates `currentData` and returns it, so any other child of
`dummyRoom` survives; the port returns a freshly built
`{ players, groups, history }`, which would delete unknown siblings. Grepping the
ground truth for every `dummyRoom` reference (sanitized L517-519, L909, L1055,
L1114-1115) shows only `players`, `groups` and `history` ever exist, so nothing
is lost today. No change required - recorded so a future writer of a fourth child
node knows this transaction would drop it.

### 5. `src/components/ScoreEntry.tsx:66` - live history subscription for a one-shot read (accepted, noted only)

`useHistory()` opens a `dummyRoom/history` listener for the whole score-entry
step purely so the comeback check has the prior rounds. It is correctly cleaned
up and it is what the legacy global `matchHistory` effectively was, so this is
fine; a one-shot `readList` at confirm time would transfer less, and is worth
considering when the history page lands and the payload grows.

---

## 4. Summary

Build, type-check and lint are clean. No `any`, no emoji (including every roast
string), no `alert`/`confirm`/`prompt`, no hardcoded `dummyRoom` in writing code,
no raw hex, Thai UI with English comments, lucide icons, responsive layout. The
transaction is faithful to `confirmAndSaveRound` including the null-first-pass
handling, the array shapes, the `pIndex > -1` guard, the group upsert and the
history keying, and `generateRoundCommentary` matches the legacy line for line.

Finding 1 is a real, reproducible user-visible defect on every save and finding 3
is a one-token robustness regression against the legacy; both must be fixed
before hand-off. Finding 2 should go with them.

NOT PASSED
