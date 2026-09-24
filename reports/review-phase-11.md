# Review - Phase 11 (bi-weekly period leaderboard)

Reviewer: `code-reviewer` agent. Date: 2026-09-24. Branch: `main`.

Scope: the uncommitted working-tree change only.

```
$ git status --short
 M src/components/Leaderboard.tsx
?? src/lib/leaderboard.ts
?? src/lib/periods.ts
```

This review ran in two passes. The first pass produced three concrete findings
(zero-history empty-state copy, a hard-coded `งวดนี้` title, and a Gregorian year
in a Thai label); the coordinator applied fixes for all three, and this report
reflects the final code - every command below was re-run against it. Section 13
verifies the three fixes line by line.

Read first: `CLAUDE.md` (project rules) and
`reference/legacy-prototype.sanitized.html` (behavioural ground truth, 1647
lines). Every line citation references that sanitized file. This phase is
net-new - the prototype has no period concept - so ground truth is used to prove
that the schema, the RTDB paths and the scoring math were not disturbed.

## 1. Build

```
$ npm run build

> cosmo999@0.1.0 build
> next build

   Next.js 15.5.24
   - Environments: .env.local

   Creating an optimized production build ...
 ✓ Compiled successfully in 3.3s
   Linting and checking validity of types ...

./src/components/LatestRoundCard.tsx
169:11  Warning: Using `<img>` could result in slower LCP and higher bandwidth. ... @next/next/no-img-element

./src/components/Leaderboard.tsx
164:11  Warning: Using `<img>` could result in slower LCP and higher bandwidth. ... @next/next/no-img-element
251:9  Warning: Using `<img>` could result in slower LCP and higher bandwidth. ... @next/next/no-img-element

./src/components/RoundSetup.tsx
242:13  Warning: Using `<img>` could result in slower LCP and higher bandwidth. ... @next/next/no-img-element

info  - Need to disable some ESLint rules? ...
   Collecting page data ...
   Generating static pages (0/9) ...
   Generating static pages (2/9)
   Generating static pages (4/9)
   Generating static pages (6/9)
 ✓ Generating static pages (9/9)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                    10.8 kB         163 kB
├ ○ /groups                               4.91 kB        155 kB
├ ○ /history                              3.24 kB        156 kB
├ ○ /icon.svg                                 0 B          0 B
├ ○ /leaderboard                          5.99 kB        156 kB
├ ○ /_not-found                              994 B        104 kB
└ ○ /stats                                5.37 kB        156 kB
+ First Load JS shared by all             103 kB

build exit=0
```

Build finished with no errors. The check glyphs above are Next.js build-output
characters, not authored emoji.

All 4 warnings are `@next/next/no-img-element` and all are pre-existing. The two
in `Leaderboard.tsx` are the meme `<img>` tags that already exist in the committed
file at lines 147 and 226; they sit at 164 and 251 only because this diff inserted
code above them (the fix-pass edits are all below line 500, so those numbers did
not move again):

```
$ git show HEAD:src/components/Leaderboard.tsx | grep -n "<img"
147:          <img
226:        <img
```

`reports/review-phase-9.md:26` and `reports/review-phase-10.md:51` already
recorded these same warnings as pre-existing and non-blocking. That precedent
holds; this diff introduces no new warning.

## 2. Type check

```
$ npx tsc --noEmit
(no output)
tsc exit=0
```

## 3. Lint

```
$ npm run lint

> cosmo999@0.1.0 lint
> eslint

F:\0-projects\COSMO999\src\components\LatestRoundCard.tsx
  169:11  warning  Using `<img>` ...  @next/next/no-img-element

F:\0-projects\COSMO999\src\components\Leaderboard.tsx
  164:11  warning  Using `<img>` ...  @next/next/no-img-element
  251:9   warning  Using `<img>` ...  @next/next/no-img-element

F:\0-projects\COSMO999\src\components\RoundSetup.tsx
  242:13  warning  Using `<img>` ...  @next/next/no-img-element

4 problems (0 errors, 4 warnings)
```

0 errors, same 4 pre-existing warnings.

## 4. No `any`

```
$ grep -rnE ": any|as any|<any>|any\[\]" src
(empty)
exit=1
```

Pass.

## 5. No emoji

```
$ LC_ALL=C.UTF-8 grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src
(empty)
exit=1
```

Pass on the code. The full-scope run over `src .claude/agents CLAUDE.md reports`
reports hits only inside pre-existing `reports/*.md` from earlier phases:
`reports/review-phase-7.md:27-31` holds five literal U+2705 emoji, and
`reports/review-phase-3b|4|5|6|10.md` hold the U+2713 glyph inside pasted Next.js
build output. No hit is in a code file or in anything this diff touched - the same
classification recorded in `reports/review-phase-9.md:80` and
`reports/review-phase-10.md`. (Written out in words here so this report does not
re-introduce those characters.)

Icons in the new UI come from `lucide-react`: `CalendarX` for the period empty
state, plus the pre-existing `Crown`, `Spade`, `Flame`, `Ghost`, `Banknote`,
`TriangleAlert`, `Users`.

## 6. Read-only: no Firebase write was added

```
$ grep -nE "\b(set|update|push|remove|runTransaction|transaction)\s*\(" src/lib/periods.ts src/lib/leaderboard.ts src/components/Leaderboard.tsx
src/lib/periods.ts:75:      byKey.set(period.key, period);

$ grep -n "firebase" src/lib/periods.ts src/lib/leaderboard.ts src/components/Leaderboard.tsx
(empty)
exit=1
```

The single `set(` hit is `Map.prototype.set` on the local dedup map inside
`listPeriodsInHistory` - not a database call. None of the three files import
`firebase` or `firebase/database`; the component reads only through `usePlayers`
and `useHistory`, which are `onValue` subscriptions. Because `git status --short`
lists only these three files, no write can have been added anywhere else.

Listener cleanup is intact: `src/hooks/useHistory.ts` returns the
`subscribeToList` unsubscribe from its effect (same pattern as `usePlayers`), so
the new second subscription detaches on unmount.

## 7. No new dependency

```
$ git status --porcelain package.json package-lock.json
(empty - both untouched)
```

`src/lib/periods.ts` uses native `Date` / `Date.UTC` only. No date library.

## 8. Period views derive from history, never from `Player.totalScore`

```
$ grep -rn "totalScore" src/lib/periods.ts src/lib/leaderboard.ts src/components/Leaderboard.tsx
src/lib/leaderboard.ts:3:// Player.totalScore, so period views can never drift from the source of
```

The only occurrence is inside an English comment. `Leaderboard.tsx` read
`player.totalScore` on six lines before this diff and reads it nowhere now -
every rendered number comes from `aggregatePeriod(history, viewKey)`.

This matches the prototype's own stance that history is the authority:
`recalculateScoresFromHistory`
(`reference/legacy-prototype.sanitized.html:1092-1111`) rebuilds `totalScore`
purely by summing `log.playerScores` over `matchHistory`, and undo (lines
1063-1074) decrements `totalScore` in the very transaction that deletes the
history row, so the two representations are kept in sync by design.

## 9. Bangkok (UTC+7) boundary correctness - proven with real values

I wrote my own harness against the real `src/lib/periods.ts` and
`src/lib/leaderboard.ts` - 46 assertions covering day 15 vs 16, the 1st, end of
month for 31/30/29/28-day months, cross-month and cross-year rollover, the 17:00Z
boundary where the UTC day has not turned over but the Bangkok day has,
`getCurrentPeriod` against an injected clock, `listPeriodsInHistory` dedup and
ordering, `aggregatePeriod` scoping, and (added in the fix pass) the
Buddhist-era label versus the Gregorian `key` / `year`. It lives in the session
scratchpad, not in the repo:

```
$ npx tsx --tsconfig ./tsconfig.json <scratchpad>/period-check.ts
--- A/B split: day 15 vs day 16 (Bangkok civil date) ---
PASS  15 Mar 12:00 BKK -> A  -> "2025-03-A"
PASS  16 Mar 12:00 BKK -> B  -> "2025-03-B"
--- the 17:00Z boundary: last instant of a BKK day vs first ---
PASS  15 Mar 23:59:59 BKK -> A  -> "2025-03-A"
PASS  16 Mar 00:00:00 BKK -> B  -> "2025-03-B"
PASS  1 Apr 00:00 BKK (31 Mar 17:00Z) -> 2025-04-A  -> "2025-04-A"
PASS  31 Mar 23:59:59 BKK -> 2025-03-B  -> "2025-03-B"
--- 1st of month ---
PASS  1 Jun 00:30 BKK -> A  -> "2025-06-A"
PASS  1 Jun label  -> "1–15 มิ.ย. 2568"
--- end-of-month label for 31/30/29/28 day months ---
PASS  31-day (Jan 2025) label  -> "16–31 ม.ค. 2568"
PASS  30-day (Apr 2025) label  -> "16–30 เม.ย. 2568"
PASS  28-day (Feb 2025) label  -> "16–28 ก.พ. 2568"
PASS  29-day (Feb 2024 leap) label  -> "16–29 ก.พ. 2567"
PASS  28 Feb 2025 23:59 BKK -> 2025-02-B  -> "2025-02-B"
PASS  29 Feb 2024 23:59 BKK -> 2024-02-B  -> "2024-02-B"
PASS  1 Mar 2024 00:00 BKK -> 2024-03-A  -> "2024-03-A"
--- cross-year rollover ---
PASS  1 Jan 2026 00:00 BKK -> 2026-01-A  -> "2026-01-A"
PASS  31 Dec 2025 23:59 BKK -> 2025-12-B  -> "2025-12-B"
PASS  31 Dec 2025 label  -> "16–31 ธ.ค. 2568"
--- full 12-month Thai abbreviation table (first half) ---
PASS  labels Jan..Dec 2025 first half  -> ["1–15 ม.ค. 2568","1–15 ก.พ. 2568","1–15 มี.ค. 2568","1–15 เม.ย. 2568","1–15 พ.ค. 2568","1–15 มิ.ย. 2568","1–15 ก.ค. 2568","1–15 ส.ค. 2568","1–15 ก.ย. 2568","1–15 ต.ค. 2568","1–15 พ.ย. 2568","1–15 ธ.ค. 2568"]
--- second-half end day for every month of 2025 ---
PASS  endDay per month 2025 (B half)  -> ["16–31","16–28","16–31","16–30","16–31","16–30","16–31","16–31","16–30","16–31","16–30","16–31"]
--- period object fields ---
PASS  full object for 2025-07-B  -> {"key":"2025-07-B","year":2025,"month":6,"half":"B","label":"16–31 ก.ค. 2568"}
--- getCurrentPeriod with an injected clock ---
PASS  getCurrentPeriod(31 Jan 2025 17:00Z)  -> "2025-02-A"
PASS  getCurrentPeriod(15 Aug 2025 16:59Z)  -> "2025-08-A"
PASS  getCurrentPeriod(15 Aug 2025 17:00Z)  -> "2025-08-B"
PASS  getCurrentPeriod() key shape  -> true
--- listPeriodsInHistory: dedup + newest first ---
PASS  keys newest first  -> ["2025-12-B","2025-03-B","2025-03-A","2025-01-A"]
PASS  empty history -> no periods  -> []
PASS  single entry -> one period  -> ["2025-03-A"]
--- A before B ordering inside one month, newest first ---
PASS  same month A/B order  -> ["2025-06-B","2025-06-A"]
--- aggregatePeriod ---
PASS  empty history, all  -> {}
PASS  empty history, a period  -> {}
PASS  all-time sum  -> {"a":113,"b":-106,"c":-7}
PASS  2025-03-A only (two rounds summed)  -> {"a":11,"b":-11}
PASS  2025-03-B only  -> {"a":-5,"b":5}
PASS  2025-01-A only (BKK rollover entry)  -> {"a":100,"b":-100}
PASS  2025-12-B only (player c appears)  -> {"a":7,"c":-7}
PASS  period with no rounds -> {}  -> {}
PASS  zero-sum holds per period  -> 0
PASS  a 0 score is kept, not dropped  -> {"a":0,"b":0}
--- Buddhist-era label vs Gregorian key/year field ---
PASS  key stays Gregorian  -> "2025-07-B"
PASS  year field stays Gregorian  -> 2025
PASS  label year is BE (2025 + 543)  -> true
PASS  leap Feb 2024 -> BE 2567 and endDay 29  -> "16–29 ก.พ. 2567"
PASS  non-leap Feb 2025 -> BE 2568 and endDay 28  -> "16–28 ก.พ. 2568"
PASS  BE rollover at 1 Jan 2026 BKK  -> "1–15 ม.ค. 2569"
PASS  current period label year is BE  -> true
--- robustness: malformed timestamp ---
      invalid-timestamp period -> key="NaN-NaN-B" label="16–NaN undefined NaN"

TOTAL: 46 passed, 0 failed
```

Honest note on the run: during the first pass my expected value for `all-time sum`
was wrong (10 - 5 + 1 + 100 + 7 = 113, and the code returned 113 while I had
written 103). I corrected my expectation, not the code.

Why the +7h shift is exact: Asia/Bangkok is a fixed UTC+7 offset with no DST, so
adding 7h to the instant and reading the UTC calendar fields
(`src/lib/periods.ts:55-58`) yields the Bangkok civil date with no timezone data.
`lastDayOfMonth` (lines 36-38) uses `Date.UTC(year, month + 1, 0)`, pure calendar
arithmetic on the **Gregorian** year, which is why February 2024 yields 29 and
February 2025 yields 28 even though the label prints Buddhist years.
Lexicographic sorting on `key` (line 78) is chronological because the month is
zero-padded and "A" < "B".

## 10. Firebase data shape unchanged

No model, path, or write shape was touched. Verified against ground truth:

- Paths. `reference/legacy-prototype.sanitized.html:517-519`:
  `db.ref('dummyRoom/players')`, `db.ref('dummyRoom/groups')`,
  `db.ref('dummyRoom/history')`. New code resolves the same
  (`src/lib/firebase.ts:30-39`):
  `const RTDB_ROOT = process.env.NEXT_PUBLIC_RTDB_ROOT || "dummyRoom"`, then
  `players: ${RTDB_ROOT}/players`, `groups: ...`, `history: ...`. With the env var
  unset or set to `dummyRoom` these are exactly `dummyRoom/players`,
  `dummyRoom/groups`, `dummyRoom/history`.
- History. Prototype write, lines 951-959:
  `{ id: matchId, timestamp: new Date().toISOString(), groupName: ..., groupId: groupIdStr, multiplier: tempMultiplier, playerScores: tempNetScores, commentary: roundCommentary }`.
  Model `src/types/models.ts:22-33`: `id: string`, `timestamp: string`
  (commented "ISO 8601 string from new Date().toISOString(), not a numeric
  epoch"), `groupName: string`, `groupId: string`, `multiplier: number`,
  `playerScores: Record<string, number>`, `commentary: string`. Match. The new
  code reads only `timestamp` and `playerScores`, both as declared.
- Player. Prototype line 610:
  `{ id: ..., name: name, image: '', totalScore: 0, latestScore: null }`.
  Model `src/types/models.ts:4-13`: `id: string`, `name: string`, `image: string`,
  `totalScore: number`, `latestScore: number | null`. Match.
- Group. Prototype line 939:
  `{ id: groupIdStr, name: groupNameCombined, playerIds: currentIds, scores: initialScores }`.
  Model `src/types/models.ts:15-20`: `id`, `name`, `playerIds: string[]`,
  `scores: Record<string, number>`. Match.
- Array shape of players/groups preserved. Prototype lines 1114-1115 assign whole
  arrays (`updates['dummyRoom/players'] = newPlayers`). The writers are untouched
  by this diff and still set whole arrays: `src/lib/players.ts:12`
  `await set(ref(database, DB_PATHS.players), players)` and `src/lib/groups.ts:14`
  `await set(ref(database, DB_PATHS.groups), groups)`. Nothing here turns them
  into keyed objects.

## 11. useMemo, responsive, language, theme

- `useMemo` wraps both expensive derivations: `listPeriodsInHistory(history)` at
  `src/components/Leaderboard.tsx:445-448` (dep `[history]`) and
  `aggregatePeriod(history, viewKey)` at lines 460-463 (deps
  `[history, viewKey]`). `pastPeriods` / `selectablePeriods` are plain filters over
  an already-memoised list, correctly left unmemoised. `aggregatePeriod`
  short-circuits before any `Date` allocation in the all-time branch
  (`src/lib/leaderboard.ts:15`), so the default path is one pass with no parsing.
- `getCurrentPeriod()` runs during render (line 443) and in the `useState`
  initialiser (line 442). Cheap, and it cannot cause a hydration mismatch: both
  hooks start `loading: true`, so the prerendered HTML for the static
  `/leaderboard` route is the skeleton, which does not depend on `viewKey`.
- Responsive: `ViewSwitcher` (lines 386-433) is mobile-first -
  `flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`, the
  segmented toggle is `w-fit`, and the `<select>` has no width class so it
  stretches in the mobile column and sizes to content from `sm` up. No fixed pixel
  width, no `min-w`, nothing that can overflow. Its styling matches the established
  pattern at `src/components/Stats.tsx:197`.
- Language split: new user-facing strings are Thai only - `งวดนี้`, `ตลอดกาล`,
  `ดูงวดย้อนหลัง...` (also the select's `aria-label`), `ไม่พบรอบในงวดที่เลือก`,
  `ยังไม่มีการบันทึกคะแนนในช่วง ... ลองดูงวดอื่นหรือสลับไปดูตลอดกาล`, `งวด <label>`,
  and the twelve Thai month abbreviations in `src/lib/periods.ts:18-31`. Every
  comment in all three files is English, including the two comments added in the
  fix pass. No Thai in comments, no English in the UI.
- Theme: no raw hex in the three files.

```
$ grep -nE "#[0-9a-fA-F]{3,8}\b" src/lib/periods.ts src/lib/leaderboard.ts src/components/Leaderboard.tsx
(empty)
exit=1
```

  Every colour class maps to an existing `@theme` token in
  `src/app/globals.css`: `--color-border:41`, `--color-border-strong:42`,
  `--color-surface-raised:40`, `--color-accent:47`, `--color-on-accent:49`,
  `--color-text:44`, `--color-text-muted:45`.

## 12. The three judgment calls

1. Empty check moved from `totalScore === 0` to "zero matching history entries"
   (`src/components/Leaderboard.tsx:464`). No regression: with no history at all
   `aggregatePeriod` returns `{}` for every view (the two `empty history`
   assertions), and after the fix pass that case now shows the original
   `ยังไม่มีใครลงมือเล่น` CTA in **every** view, not just all-time. It is also
   strictly better than the legacy check - the prototype
   (`reference/legacy-prototype.sanitized.html:1552-1554`, comment "Hide Top Stats
   if everyone has 0 score (i.e. just reset)") hid the board whenever every player
   netted exactly 0, which real rounds can produce.
2. `showLatestScore = viewKey === "all"` is applied consistently. `Player.latestScore`
   is a global most-recent-round value, so hiding it in a period view is right.
   Podium: lines 190-192. List row: lines 302-304. The roast callout never rendered
   `LatestScoreLabel` - not before this diff (`git show HEAD:...`) and not now - so
   nothing is inconsistent there. `LatestScoreLabel` has exactly two call sites and
   both are gated.
3. Excluding the current period from the past-periods dropdown (lines 449-451) is
   correct: no duplicate entry for the segment button, and the select falls back to
   the `ดูงวดย้อนหลัง...` placeholder whenever the active view is the current period
   or all-time (line 418), so it never shows a stale selection. Cross-checked
   against the toggle logic at lines 383-384 and 391/402.

## 13. Verification of the three fixes applied after the first pass

Fix 1 - zero-history empty state. `src/components/Leaderboard.tsx:517` now reads
`{viewKey === "all" || history.length === 0 ? (` with the Spade CTA in the true
branch. Correct and complete: if `history.length === 0` then
`aggregatePeriod(history, anyView)` returns `{}` for every view (harness:
`empty history, all` and `empty history, a period`), so `isViewEmpty` is true no
matter which view is active, and the branch now reaches the
`ยังไม่มีใครลงมือเล่น` / `เริ่มรอบแรกกันเลย ...` CTA instead of advising a dropdown
that is not rendered (`pastPeriods` is empty in that state). The reverse case is
also sound: `history.length === 0` can never coexist with a non-empty `scores`, so
the new disjunct cannot swallow a real period view. The switcher stays above the
message, so the user can still move between views. The English comment added at
lines 503-508 explains exactly this and is accurate.

Fix 2 - neutral title. Line 526 is now `title="ไม่พบรอบในงวดที่เลือก"` ("no rounds
found in the selected period"). This is true for the current period and for a past
period alike, which is what the branch needs after fix 1, since the only remaining
way in is "this particular period has no rounds while others do" - including the
undo race on a past period. The description still carries the exact period label,
so no information is lost. Thai only, no emoji.

Fix 3 - Buddhist-era label. `src/lib/periods.ts:48` is now
`` const label = `${startDay}–${endDay} ${THAI_MONTH_ABBR[month]} ${year + 543}` ``
with an English comment at lines 44-47. The conversion is display-only and I
verified that from three directions:

- `key` (line 43) still interpolates the plain `year`, and `Period.year` (line 49)
  is still the Gregorian value. Harness: `key stays Gregorian -> "2025-07-B"`,
  `year field stays Gregorian -> 2025`, `label year is BE (2025 + 543) -> true`.
  So dedup, sorting, the current-period comparison and all aggregation are
  untouched - every key assertion in section 9 still passes unchanged.
- `lastDayOfMonth` still receives the Gregorian year, so leap years are unaffected:
  `leap Feb 2024 -> BE 2567 and endDay 29` and
  `non-leap Feb 2025 -> BE 2568 and endDay 28` both pass. Had the BE year leaked
  into that call, February 2024 would have printed 28.
- It now matches the rest of the app. Live values today:

```
$ npx tsx --tsconfig ./tsconfig.json <scratchpad>/now.ts
today: 2026-09-24T13:22:11.717Z
period object: {"key":"2026-09-B","year":2026,"month":8,"half":"B","label":"16–30 ก.ย. 2569"}
header renders: งวด 16–30 ก.ย. 2569

$ node -e "const d=new Date('2026-09-24T13:22:11Z'); console.log('History.tsx      :', d.toLocaleString('th-TH')); console.log('LatestRoundCard  :', d.toLocaleString('th-TH', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}));"
History.tsx      : 24/9/2569 20:22:11
LatestRoundCard  : 24 ก.ย. 20:22
```

  `src/components/History.tsx:49` prints 2569 and the new label prints 2569;
  `src/components/LatestRoundCard.tsx:63-68` prints no year at all. Those are the
  only date-formatting call sites in `src` (`grep -rn "toLocale|getFullYear|543"`),
  so the app now shows one era everywhere. The hand-written month table is also
  byte-identical to the platform's Thai short names, so the two surfaces agree on
  spelling as well:

```
$ node -e "... Intl.DateTimeFormat('th-TH', {month:'short'}) vs THAI_MONTH_ABBR ..."
Intl th-TH short : ม.ค. ก.พ. มี.ค. เม.ย. พ.ค. มิ.ย. ก.ค. ส.ค. ก.ย. ต.ค. พ.ย. ธ.ค.
THAI_MONTH_ABBR  : ม.ค. ก.พ. มี.ค. เม.ย. พ.ค. มิ.ย. ก.ค. ส.ค. ก.ย. ต.ค. พ.ย. ธ.ค.
identical        : true
```

Nothing else moved. `git diff -U0` shows the only hunks outside the previously
reviewed set are in the `isViewEmpty` block, and I re-read
`src/components/Leaderboard.tsx:436-601` and `src/lib/periods.ts` in full: lines
436-500 and 534-600 are unchanged, and `periods.ts` differs only in `buildPeriod`'s
label plus its comment.

## Findings

The three findings from my first pass (zero-history empty state, hard-coded
`งวดนี้` title, Gregorian year in a Thai label) are fixed and verified in section
13, so they are closed. What remains is the list below. Nothing in it blocks
hand-off: items 1-3 are optional polish, 4-6 are context on pre-existing code.

1. `src/components/Leaderboard.tsx:46-92` (`usePulseOnChange`) - the pulse no
   longer fires on a player's *first* round inside the viewed period. The baseline
   is now the period-scoped `scores` object and the guard `before !== undefined`
   (line 62) skips ids absent from the previous snapshot; a player with no rounds
   yet in this period is absent, so their first round lands without the flash.
   Before this diff the baseline held every player, so every change flashed. Purely
   cosmetic, self-corrects on the next round. Fix if wanted: seed the baseline from
   `players` ids at `0` behind a `hasBaseline` ref instead of dropping unknown ids.
2. `src/lib/periods.ts:8-16` - mild speculative surface. Only `key` and `label` are
   consumed by callers; `year`, `month`, `half` and the exported `PeriodHalf` have
   no consumer outside the module:

```
$ grep -rn "\.half\b|\.month\b|\.year\b|PeriodHalf" src --include=*.ts --include=*.tsx | grep -v "^src/lib/periods.ts"
(empty)
```

   Not worth churn - the fields are intrinsic to the record and used inside
   `buildPeriod` - but `PeriodHalf` need not be exported.
3. `src/lib/leaderboard.ts:11` - `periodKey: string | "all"` collapses to `string`
   in TypeScript, so the union documents intent without enforcing anything. Fine as
   documentation; just do not read it as a type guarantee.
4. `src/lib/leaderboard.ts:18` reads `Object.entries(entry.playerScores)` with no
   fallback, while the prototype guards every equivalent read with
   `log.playerScores || {}` (`reference/legacy-prototype.sanitized.html:1023, 1063,
   1104, 1147, 1209`). The current codebase is already split - `History.tsx:71`,
   `rounds.ts:174`, `rounds.ts:248`, `stats.ts:51` unguarded;
   `LatestRoundCard.tsx:45`, `RoundSetup.tsx:34` guarded - the model declares the
   field required, and `rounds.ts:100` always writes it. The new code follows the
   accepted majority pattern, so this is noted, not re-litigated.
5. Robustness only: a history row with a missing or unparseable `timestamp` yields
   `key="NaN-NaN-B"` and a junk label (last line of the harness output), which would
   surface as a junk dropdown entry. Unreachable from either writer - the prototype
   (line 953) and `src/lib/rounds.ts:96` both write `new Date().toISOString()` - and
   `History.tsx:49` is equally unguarded today.
6. Pre-existing, out of scope: the podium's three `w-24` cards plus `gap-3` need
   312px inside a `px-4` main, so they can overflow a 320px-wide viewport. Those
   width classes are untouched here (the diff only changed the props the cards
   receive), and the same class of fix landed for the groups grid in commit
   053460b. Also pre-existing: the emoji in `reports/review-phase-7.md`, flagged in
   phases 9 and 10, still awaiting a docs pass.

## Verdict

The period engine is correct on every boundary I could construct - the 17:00Z case
where the UTC day has not turned over but the Bangkok day has, the 28/29/30/31-day
month ends, cross-month and cross-year rollover - and 46 of 46 assertions against
the real modules pass, including the new ones proving the Buddhist-era label is
display-only while `key`, `Period.year` and the leap-year arithmetic stay
Gregorian. The feature is genuinely read-only and derives from `history` alone,
both expensive derivations are memoised, the RTDB paths and all three models still
match the sanitized prototype exactly, the players/groups array shape is untouched,
and there is no new dependency. The three fixes from my first pass are correctly
applied and disturb nothing else. Build, `tsc --noEmit` and lint all return zero
errors, with only the pre-existing `no-img-element` warnings accepted in phases 9
and 10. No `any`, no emoji in any code file, Thai UI text with English comments,
lucide icons, no raw hex. The remaining findings are polish and context, not fixes
that must land before hand-off.

PASSED
