# Review - Phase 14 (period filter, Hall of Fame card, player stats, group stats, player list)

Scope - the uncommitted working tree on `develop`:

```
$ git status --short
 M src/components/AnimatedNumber.tsx
 M src/components/GroupScoreDialog.tsx
 M src/components/Groups.tsx
 M src/components/Leaderboard.tsx
 M src/components/PlayerList.tsx
 M src/components/Stats.tsx
 M src/lib/honors.ts
 M src/lib/stats.ts
?? src/components/HallOfFameCard.tsx
?? src/lib/format.ts
?? src/lib/groupStats.ts

$ git diff --stat
 src/components/AnimatedNumber.tsx   |  14 ++++-
 src/components/GroupScoreDialog.tsx | 114 +++++++++++++++++++++++++++++++-----
 src/components/Groups.tsx           |   3 +
 src/components/Leaderboard.tsx      | 104 ++++++--------------------------
 src/components/PlayerList.tsx       |  15 +----
 src/components/Stats.tsx            |  44 ++++++++------
 src/lib/honors.ts                   |  33 +++++++++--
 src/lib/stats.ts                    |  66 ++++++++++++++++++---
 8 files changed, 247 insertions(+), 146 deletions(-)
```

All changes are read-only derivations over data already fetched by the existing
hooks. No write path, no RTDB path and no model was touched:

```
$ git diff --stat src/types
models diff exit=0   (empty = src/types/models.ts unchanged)
```

---

## 1. Build

```
$ npm run build
./src/components/RoundSetup.tsx
242:13  Warning: Using `<img>` could result in slower LCP ...  @next/next/no-img-element

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
┌ ○ /                                    11.1 kB         164 kB
├ ○ /_not-found                            996 B         104 kB
├ ○ /groups                              6.99 kB         157 kB
├ ○ /history                             3.24 kB         156 kB
├ ○ /icon.svg                                0 B            0 B
├ ○ /leaderboard                         8.48 kB         159 kB
└ ○ /stats                               5.84 kB         156 kB
+ First Load JS shared by all             103 kB
  ├ chunks/255-c5a697ddbf82d774.js       46.4 kB
  ├ chunks/4bd1b696-c023c6e3521b1417.js  54.2 kB
  └ other shared chunks (total)             2 kB

○  (Static)  prerendered as static content

build exit=0
```

No stale `.next` problem; the build succeeded on the first run. The only
warnings are the four pre-existing `no-img-element` ones:

```
$ npm run build 2>&1 | grep -n "Warning\|Error"
12:169:11  Warning: Using `<img>` ...  @next/next/no-img-element
15:188:11  Warning: Using `<img>` ...  @next/next/no-img-element
16:283:9   Warning: Using `<img>` ...  @next/next/no-img-element
19:242:13  Warning: Using `<img>` ...  @next/next/no-img-element
```

## 2. Type check and lint of the changed files

```
$ npx tsc --noEmit
tsc exit=0

$ npx eslint src/components/AnimatedNumber.tsx src/components/GroupScoreDialog.tsx \
    src/components/Groups.tsx src/components/Leaderboard.tsx src/components/PlayerList.tsx \
    src/components/Stats.tsx src/components/HallOfFameCard.tsx src/lib/honors.ts \
    src/lib/stats.ts src/lib/format.ts src/lib/groupStats.ts
/home/user/COSMO999/src/components/Leaderboard.tsx
  188:11  warning  Using `<img>` ...  @next/next/no-img-element
  283:9   warning  Using `<img>` ...  @next/next/no-img-element
✖ 2 problems (0 errors, 2 warnings)
lint exit=0
```

Both warnings are the pre-existing meme `<img>` tags. No unused imports are
left behind after the removal of `HonoreeGroup`, `HallOfFameEntry`,
`TrendingDown` (Leaderboard) and `scoreTone` (PlayerList).

## 3. No `any`

```
$ grep -rnE ": any|as any|<any>|any\[\]" src
any exit=1 (1 = no match = pass)
```

## 4. No emoji

```
$ LC_ALL=C.UTF-8 grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src .claude/agents CLAUDE.md
emoji (src, agents, CLAUDE.md) exit=1 (1 = no match = pass)
```

With `reports` added to the scan the only hits are verbatim build/ESLint output
pasted into earlier reports (`✓`, `✖`) and the pre-existing check marks in
`reports/review-phase-7.md:27-31`. None of them come from this phase. Every new
icon is a lucide component (`Crown`, `PiggyBank`, `Target`, `Gamepad2`,
`Users`); the "?" fallback disc in `HallOfFameCard.tsx` is a plain ASCII
character.

## 5. Theme tokens, no hardcoded hex

```
$ git diff -U0 | grep -nE "#[0-9a-fA-F]{3,8}\b"
$ grep -nE "#[0-9a-fA-F]{3,8}\b" src/components/HallOfFameCard.tsx src/lib/format.ts src/lib/groupStats.ts
hex exit=1 (1 = no match = pass)
```

New classes only use semantic tokens (`accent`, `danger`, `success`, `text`,
`text-muted`, `surface`, `surface-raised`, `border`, `shadow-gold`). The only
arbitrary values are font sizes (`text-[10px]`, `text-[11px]`), not colours.

## 6. Data shape against the ground truth

Models are unchanged. The new code only reads `HistoryEntry.multiplier`,
`HistoryEntry.playerScores`, `HistoryEntry.groupId`, `Group.playerIds` and
`Group.scores`, which match the legacy history write:

```
reference/legacy-prototype.sanitized.html:951-958
    currentData.history[matchId] = {
        id: matchId,
        timestamp: new Date().toISOString(),
        groupName: safeGroups[gIndex].name,
        groupId: groupIdStr,
        multiplier: tempMultiplier,
        playerScores: tempNetScores,
        commentary: roundCommentary
```

```
src/types/models.ts
  playerIds: string[];
  scores: Record<string, number>;
  multiplier: number;
  playerScores: Record<string, number>;
```

`multiplier` is always an integer from `parseInt` in the legacy app
(`legacy-prototype.sanitized.html:765`) and `playerScores` holds the multiplied
net (`tempNetScores`), so dividing the multiplier back out
(`src/lib/stats.ts` `toRawScore`) is exact for every app-written row.

## 7. Correctness, requirement by requirement

### 7.1 Leaderboard period filter (`src/components/Leaderboard.tsx:584-597`, used at L684)

- `visiblePlayers` keeps a player in a period view iff
  `scores[player.id] !== undefined`. `aggregatePeriod` adds a key for every id
  present in a round's `playerScores`, including a 0, so a player who played and
  finished on exactly 0 stays (verified below: `{ a: 0, b: 0 }`).
- `viewKey === "all"` returns `players` untouched, so the all-time view still
  lists everyone.
- Hook order: `useMemo(visiblePlayers)` sits with the other hooks, before the
  first early return (`if (loading)`). All hooks (`usePlayers`, `useHistory`, two
  `useState`, five `useMemo`, `usePulseOnChange`) run unconditionally on every
  render. Rules of Hooks respected.
- `Podium` already tolerates fewer than three entries (`entries[rank - 1]` is
  null-checked), and `showRoast` needs two or more, so a period with one visible
  player renders correctly.

### 7.2 Hall of Fame card (`src/components/HallOfFameCard.tsx`, `src/lib/honors.ts`)

- `roundCount` is counted per period key with the same `getPeriodOfTimestamp`
  that `listPeriodsInHistory`/`aggregatePeriod` use, so the pill and the
  ranking always agree. `playerCount` is `entries.length` of the aggregate, i.e.
  distinct players who scored.
- `championScore`/`lastPlaceScore` come straight from the highest/lowest values
  `rankPeriod` already computed; `rankPeriod` still returns null when
  `highest === lowest`, so `gap` is always strictly positive and the VS view never
  shows the same player on both sides.
- Ties: every co-champion / co-last-place avatar and name is rendered and the
  shared score is shown once - correct, since they share one score by definition.
- Deleted players: `HonoreeAvatar` falls back to a "?" disc and the name falls
  back to "(ถูกลบ)".
- `getTrophyCounts` only destructures `championIds`/`lastPlaceIds`, so the extra
  fields do not affect it.

### 7.3 Player stats (`src/lib/stats.ts`, `src/components/Stats.tsx`)

`getRoundResult` changes the win rule from `score === maxScore` (HEAD) to
`score > 0 && score === maxScore`. Scoring is zero-sum (`src/lib/scoring.ts:19`,
`netScore[i] = (sum over j != i of (raw[i] - raw[j])) * multiplier`; the legacy
preview rejects any round whose total is not 0,
`legacy-prototype.sanitized.html:777-779`). In a zero-sum round the top score
is always >= 0 and equals 0 only when every score is 0. So for all app-written
data the new rule differs from HEAD in exactly one case - the all-zero draw -
which moves from "win for everyone" to "other". That is the intended fix, and it
also brings the rule closer to the legacy `if (s > 0) wins++`
(`legacy-prototype.sanitized.html:1240`).

Callers of `getRoundResult`: only `computePlayerStats` and `computeGroupStats`.
`honors.ts`, `leaderboard.ts` and the round write/undo paths do not use it, so
nothing else changes. `winRate` still excludes "other" rounds from the
denominator and is guarded against 0/0.

Header shows `<AnimatedNumber value={stats.totalScore} grouped />` in
`text-base font-bold` plus a `(คะแนนดิบ: ...)` line. The old "คะแนนสะสม" card is
replaced by "ตัวคูณที่ชนะ (ครั้ง)" tags sorted ascending, with "-" when
`multiplierWins` is empty. `multiplierWins` sums to `wins` by construction.

### 7.4 Group score dialog (`src/lib/groupStats.ts`, `GroupScoreDialog.tsx`, `Groups.tsx`)

- `history` is passed as `null` while loading or on error, and the dialog falls
  back to the old plain score list - no flash of "0 rounds".
- `useMemo` is unconditional and placed before `useEffect`; it is keyed on
  `[group, history]`.
- Leader / last place come from `group.scores` (the same numbers the list is
  sorted by), so the crown always sits on the top row. Both are empty when the
  group is level or has fewer than two members.
- Nemesis = non-leaders with `wins > 0` and the most wins; `Math.max(0, ...)` on an
  empty list gives 0 and the filter then returns nothing. Nemesis is suppressed
  when there is no leader.
- Members without a profile (deleted) still get a record and "(ถูกลบ)". A member
  with no decisive round renders "ชนะ 0 • แพ้ 0" without a percentage.
- The dialog gained `max-h-[calc(100dvh-2rem)] overflow-y-auto`, so the taller
  rows scroll inside the dialog on a short phone screen.

### 7.5 Player list (`src/components/PlayerList.tsx`)

Only the `<p>` that rendered `คะแนนรวม` and its `scoreTone` helper were
removed. No write, no field, no data deletion; `player.totalScore` is still
stored and still used by the leaderboard and score writes.

### 7.6 Adversarial run of the pure functions

```
$ node scratchpad/run.mjs   (jiti with the "@" alias, imports the real src/lib modules)
draw a: other
tie-top: win
middle+: other
raw guard: 100 100
stats a: {
  wins: 2, losses: 1, zeros: 1, winRate: 66.66666666666666,
  total: 270, raw: 80,
  mw: [ { multiplier: 2, count: 1 }, { multiplier: 4, count: 1 } ]
}
group: {"totalRounds":4,"records":{"a":{"wins":2,"losses":1,"winRate":66.66666666666666},
  "b":{"wins":2,"losses":1,"winRate":66.66666666666666},"c":{"wins":0,"losses":3,"winRate":0},
  "gone":{"wins":0,"losses":0,"winRate":null}},"leaderIds":["a"],"lastPlaceIds":["c"],"nemesisIds":["b"]}
level: {"totalRounds":0,"records":{"a":{"wins":0,"losses":0,"winRate":null},
  "b":{"wins":0,"losses":0,"winRate":null}},"leaderIds":[],"lastPlaceIds":[],"nemesisIds":[]}
agg zero stays: { a: 0, b: 0 }
```

Inputs: rounds `{a:140,b:-20,c:-120} x2`, `{0,0,0} x1`, `{a:160,b:160,c:-320} x4`,
`{a:-30,b:60,c:-30} x1`; group with a deleted member `gone` and no `scores`
entry for it. Raw total `140/2 + 0 + 160/4 - 30 = 80` is correct; the shared-top
round is a win for both a and b; the draw is "other"; a non-positive multiplier
is read as x1; an empty group has no badges and no division by zero.

Negative-zero check for the new formatter:

```
$ node -e 'const f=new Intl.NumberFormat("en-US"); console.log(JSON.stringify([f.format(-0), f.format(Math.round(-0.4)), String(Math.round(-0.4)), f.format(70/3)]))'
["-0","-0","0","23.333"]
```

## 8. Language split

All new UI text is Thai (`ดวลกันไปแล้วทั้งหมด N รอบ`, `เจ้ามือประจำกลุ่ม`,
`สปอนเซอร์กลุ่ม`, `มือปราบแชมป์`, `ชนะ N • แพ้ M`, `แชมป์ประจำงวด`, `หมูแจกแต้ม`,
`ผลต่าง`, `แต้ม`, `คน`, `รอบ`, `ตัวคูณที่ชนะ (ครั้ง)`, `คะแนนดิบ`). The `•`
separator is U+2022, outside the emoji ranges. Every new comment is English.

## 9. Responsive

- Hall of Fame card: `grid-cols-[1fr_auto_1fr]`, side columns are `min-w-0` with
  `truncate` names, labels may wrap (`flex-wrap`), the gap number is
  `whitespace-nowrap` while "ผลต่าง" can wrap above it. Avatars shrink from
  `size-14` to `size-10` when a side has co-honorees. Fits a 320px phone; on
  iPad (`sm:`) the avatars grow to `size-16` and the gap widens.
- Header pills use `flex-wrap justify-between`, so they drop below the title on
  narrow screens instead of overflowing.
- Stats tag card uses `flex flex-wrap gap-1.5`; at most seven multipliers
  (`legacy-prototype.sanitized.html:630`) wrap inside the 2-column phone grid.
- Group dialog width unchanged (`w-[min(26rem,calc(100vw-2rem))]`), now
  scrollable vertically; badges `flex-wrap`.

## 10. Over-engineering

`format.ts` (two formatters, both used), `groupStats.ts` (pure, used once but
keeps the dialog presentational, consistent with `stats.ts`/`honors.ts`), the
`grouped` flag on `AnimatedNumber` and the `valueClassName` prop on `StatCard`
are each the minimum needed for the feature. `getRoundResult` is shared by two
callers so "ชนะ" means the same everywhere. No speculative config or dead code.

## 11. Second pass - negative-zero fix

After the first pass (verdict NOT PASSED on Finding 1) the coordinator changed
`src/lib/format.ts`. I re-checked the current working tree from scratch.

The tracked diff is identical to the first pass (same 8 files, same counts); the
only change is in the untracked `src/lib/format.ts`:

```
$ git diff --stat
 src/components/AnimatedNumber.tsx   |  14 ++++-
 src/components/GroupScoreDialog.tsx | 114 +++++++++++++++++++++++++++++++-----
 src/components/Groups.tsx           |   3 +
 src/components/Leaderboard.tsx      | 104 ++++++--------------------------
 src/components/PlayerList.tsx       |  15 +----
 src/components/Stats.tsx            |  44 ++++++++------
 src/lib/honors.ts                   |  33 +++++++++--
 src/lib/stats.ts                    |  66 ++++++++++++++++++---
 8 files changed, 247 insertions(+), 146 deletions(-)

$ cat src/lib/format.ts   (tail)
// Thousands-grouped score with an explicit "+" on gains: 18580 -> "+18,580",
// -580 -> "-580", 0 -> "0". Intl prints negative zero as "-0" (which Math.round
// produces for values just below 0 mid count-up), so zero is handled first.
export function formatSignedScore(score: number): string {
  if (score === 0) return "0";
  return score > 0 ? `+${NUMBER_FORMAT.format(score)}` : NUMBER_FORMAT.format(score);
}
```

`-0 === 0` is true, so the guard catches negative zero. Verified against the
real module (jiti, `@` alias):

```
$ node scratchpad/run2.mjs
-0                 "0"
Math.round(-0.3)   "0"
Math.round(-0.5)   "0"
0                  "0"
18580              "+18,580"
-580               "-580"
0.4                "+0.4"
-0.4               "-0.4"
formatNumber(1200) "1,200"
draw a: other
tie-top: win
middle+: other
raw guard: 100 100
stats a: { wins: 2, losses: 1, zeros: 1, winRate: 66.66666666666666,
  total: 270, raw: 80, mw: [ { multiplier: 2, count: 1 }, { multiplier: 4, count: 1 } ] }
group: {"totalRounds":4,...,"leaderIds":["a"],"lastPlaceIds":["c"],"nemesisIds":["b"]}
level: {"totalRounds":0,...,"leaderIds":[],"lastPlaceIds":[],"nemesisIds":[]}
agg zero stays: { a: 0, b: 0 }
```

(`0.4` / `-0.4` never reach the formatter from `AnimatedNumber`, which passes
`Math.round(displayValue)`; they are listed only to show the guard does not
swallow non-zero values.) The logic results from section 7.6 are unchanged.

`formatNumber` has no such guard, but it is only called with non-negative
counts and a strictly positive gap, so it can never receive `-0`:

```
$ grep -rn "formatNumber(" src --include=*.tsx
src/components/HallOfFameCard.tsx:132:  ... formatNumber(result.roundCount) รอบ
src/components/HallOfFameCard.tsx:133:  ... formatNumber(result.playerCount) คน
src/components/HallOfFameCard.tsx:150:  ... formatNumber(gap) แต้ม
src/components/GroupScoreDialog.tsx:133:  ... formatNumber(stats.totalRounds) รอบ
```

Full re-run of the checks:

```
$ npm run build
 ✓ Generating static pages (9/9)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                    11.1 kB         164 kB
├ ○ /_not-found                            996 B         104 kB
├ ○ /groups                                 7 kB         157 kB
├ ○ /history                             3.24 kB         156 kB
├ ○ /icon.svg                                0 B            0 B
├ ○ /leaderboard                         8.48 kB         159 kB
└ ○ /stats                               5.83 kB         156 kB
+ First Load JS shared by all             103 kB
  ├ chunks/255-c5a697ddbf82d774.js       46.4 kB
  ├ chunks/4bd1b696-c023c6e3521b1417.js  54.2 kB
  └ other shared chunks (total)             2 kB

○  (Static)  prerendered as static content

build exit=0

$ npx tsc --noEmit
tsc exit=0

$ npx eslint <the 11 changed/new files>
  283:9   warning  Using `<img>` ...  @next/next/no-img-element
✖ 2 problems (0 errors, 2 warnings)
lint exit=0

$ grep -rnE ": any|as any|<any>|any\[\]" src
any exit=1 (no match = pass)

$ LC_ALL=C.UTF-8 grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src .claude/agents CLAUDE.md
emoji exit=1 (no match = pass)

$ git diff -U0 | grep -nE "#[0-9a-fA-F]{3,8}\b"; grep -nE "#[0-9a-fA-F]{3,8}\b" src/components/HallOfFameCard.tsx src/lib/format.ts src/lib/groupStats.ts
hex exit=1 (no match = pass)

$ git diff --stat src/types
models diff exit=0 (empty = unchanged)
```

The two lint warnings are the existing meme `<img>` tags in `Leaderboard.tsx`.

## Findings

No blocking findings remain.

Closed:

1. Negative zero rendered as "-0" by `formatSignedScore` - fixed at
   `src/lib/format.ts` with `if (score === 0) return "0";`. Verified with `-0`,
   `Math.round(-0.3)` and `Math.round(-0.5)`, all of which now print `"0"`.

Accepted observations (non-blocking, unchanged from the first pass):

2. `คะแนนดิบ` label (`src/components/Stats.tsx:247`) means pre-multiplier net
   here, not the typed raw score used by `ScoreEntry`/`PreviewDialog`. Kept
   because the user's requirement uses that wording verbatim; the coordinator
   will raise the ambiguity with the user.
3. Deterministic group ids (`src/lib/rounds.ts:74`) mean a deleted-then-recreated
   group's round count and win/loss include pre-deletion history
   (`src/lib/groupStats.ts:29`).
4. A period whose only scorers were all deleted shows the "no rounds" empty
   state (`src/components/Leaderboard.tsx:594-597`).
5. Pre-existing: the "เสมอ" bucket (`src/components/Stats.tsx:273`) also holds
   positive middle-of-the-pack finishes.

## Verdict

All five requirements are implemented as specified, and the one blocking
regression from the first pass (Finding 1) is fixed and verified with
negative-zero inputs. In this second pass the build succeeded (exit 0), `tsc` is
clean, and lint shows 0 errors on every changed file. There is no `any`, no
emoji, no hardcoded hex, and no model or RTDB path change. Hooks are ordered
correctly, and ties, empty data, deleted players and divide-by-zero are handled.
`getRoundResult` only changes the all-zero draw and has no other callers.
Observations 2-5 are accepted as non-blocking.

PASSED
