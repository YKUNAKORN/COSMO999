# Review - Phase 12 (Hall of Fame + badges / product name "Phase 9 - เกียรติยศประจำงวด")

Second pass. The first pass returned NOT PASSED on one blocking finding plus four
non-blocking ones; this pass re-verifies the whole feature from scratch against
the current working tree, not just the changed lines.

Report number note: this feature is called "Phase 9" in the product docs, but
`reports/review-phase-9.md`, `-10.md` and `-11.md` are already taken by unrelated
passed reviews (whole-project bug hunt, mobile groups layout, bi-weekly period
leaderboard). 12 is the next free number.

Scope - the uncommitted working tree:

```
$ git status --porcelain -uall
 M src/components/Leaderboard.tsx
?? reports/review-phase-12.md
?? src/lib/honors.ts

$ git status --porcelain package.json package-lock.json
(no output - no dependency change)

$ git diff --stat
 src/components/Leaderboard.tsx | 237 +++++++++++++++++++++++++++++++++++++++--
 1 file changed, 231 insertions(+), 6 deletions(-)
```

Still exactly two source files (plus this report). No schema change, no new
dependency.

Ground truth: `reference/legacy-prototype.sanitized.html` (`renderTopStats`,
L1548-L1581), `src/types/models.ts`, and the shipped Phase 8 engine
(`src/lib/periods.ts`, `src/lib/leaderboard.ts`).

---

## 1. Build

The first invocation failed, and it is worth recording exactly what happened:

```
$ npm run build
 ✓ Compiled successfully in 24.9s
   Linting and checking validity of types ...
   ... (4 pre-existing no-img-element warnings) ...
   Collecting page data ...
[Error [PageNotFoundError]: Cannot find module for page: /_not-found] {
  code: 'ENOENT'
}

> Build error occurred
[Error: Failed to collect page data for /_not-found] { type: 'Error' }
```

That is a stale `.next` artifact, not a defect in this diff: `/_not-found` is an
untouched Next.js built-in, the module was physically present on disk
(`ls .next/server/app/_not-found/` listed `page.js`,
`page_client-reference-manifest.js`), and the failure came after a successful
compile and type check. It was left over from the earlier review session sharing
the same `.next` directory. Cleared and rebuilt:

```
$ rm -rf .next && npm run build
   Collecting page data ...
   Generating static pages (0/9) ...
 ✓ Generating static pages (9/9)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                    10.8 kB         163 kB
├ ○ /groups                              4.91 kB         155 kB
├ ○ /history                             3.24 kB         156 kB
├ ○ /icon.svg                                0 B            0 B
├ ○ /leaderboard                         7.49 kB         158 kB
├ ○ /_not-found                            994 B         104 kB
└ ○ /stats                               5.37 kB         156 kB
+ First Load JS shared by all             103 kB
```

Then a second consecutive run on the warm cache, to prove it is reproducible and
not a one-off:

```
$ npm run build
   - Environments: .env.local
   Creating an optimized production build ...
 ✓ Compiled successfully in 3.7s
   Linting and checking validity of types ...
./src/components/LatestRoundCard.tsx
./src/components/Leaderboard.tsx
./src/components/RoundSetup.tsx
   Collecting page data ...
 ✓ Generating static pages (9/9)
   Finalizing page optimization ...
   Collecting build traces ...
Route (app)                                 Size  First Load JS
├ ○ /leaderboard                         7.49 kB         158 kB
+ First Load JS shared by all             103 kB
○  (Static)  prerendered as static content
```

Two consecutive clean builds, zero errors. The only warnings are the four
pre-existing `no-img-element` ones; the two on `Leaderboard.tsx` (L188, L283) are
the meme `<img>` tags, which do not appear in `git diff` - only their line
numbers moved.

## 2. Type check

```
$ npx tsc --noEmit
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
  188:11  warning  Using `<img>` ...  @next/next/no-img-element
  283:9   warning  Using `<img>` ...  @next/next/no-img-element

F:\0-projects\COSMO999\src\components\RoundSetup.tsx
  242:13  warning  Using `<img>` ...  @next/next/no-img-element

✖ 4 problems (0 errors, 4 warnings)
```

Same four pre-existing warnings, no new ones.

## 4. No `any`

```
$ grep -rnE ": any|as any|<any>|any\[\]" src
exit=1 (1 = no match = pass)
```

## 5. No emoji

```
$ LC_ALL=C.UTF-8 grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src .claude/agents CLAUDE.md
exit=1 (1 = no match = pass)
```

The prototype drew these two roles with literal emoji at
`reference/legacy-prototype.sanitized.html:1563` (crown) and `:1572` (pig),
beside the headings `เซียนไพ่` (L1566) and `หมูแจกแต้ม` (L1575). Both are lucide
components in the port: `icon={Crown}` and `icon={TrendingDown}`
(`Leaderboard.tsx:571`, `:577`) plus `<Crown className="size-3" aria-hidden />`
in `TrophyBadge` (L129). Emoji names are spelled out here rather than pasted so
this report stays clean; the only high-codepoint characters in it are the
`next build` and `eslint` status glyphs inside quoted output, the same as every
prior passed report in this folder.

## 6. Still read-only

```
$ grep -nE "firebase|[^.a-zA-Z]set\(|update\(|\.push\(|remove\(|runTransaction|ref\(|onValue" src/lib/honors.ts
61:    results.push({ period, ...ranked });

$ grep -n "^import" src/lib/honors.ts
7:import { aggregatePeriod } from "@/lib/leaderboard";
8:import { getCurrentPeriod, listPeriodsInHistory, type Period } from "@/lib/periods";
9:import type { HistoryEntry } from "@/types/models";
```

The single hit is `Array.prototype.push` on a local array. No Firebase import, no
write, nothing persisted. The component still adds no new subscription - both
tabs read the `usePlayers()` / `useHistory()` pair already mounted
(`Leaderboard.tsx:631-632`), and `useHistory` returns its unsubscribe from
`useEffect`.

## 7. Behaviour re-verified - 30 assertions against the current modules

I re-copied the four current modules into a fresh scratch dir with only the `@/`
aliases rewritten to relative paths, compiled them with the project's own
TypeScript under `--strict`, and ran an expanded suite: the full baseline from
pass one, the new guard, and - importantly - cases that would catch the guard
firing too widely.

```
$ node node_modules/typescript/lib/tsc.js --module commonjs --target es2022 --strict \
    --moduleResolution node --outDir out honors.ts leaderboard.ts periods.ts models.ts
compiled OK (strict, no errors)

$ node run-test.js
== A. baseline suite re-run against the CURRENT honors.ts ==
  PASS 1. periods returned (03-A skipped, current excluded)  => 2
  PASS 2. ordered newest-first  => ["2024-02-B","2024-01-A"]
  PASS 3. current period key absent  => false
  PASS 4. single-player period skipped  => false
  PASS 5. co-champions kept (tie at +50)  => ["alice","bob"]
  PASS 6. single last place in the tied period  => ["carol"]
  PASS 7. clean champion 2024-02-B  => ["alice"]
  PASS 8. clean last place 2024-02-B  => ["carol"]
  PASS 9. Thai period label  => "16–29 ก.พ. 2567"
  PASS 10. input history not mutated (pure)  => "[{\"id\":\"h1\",...unchanged...}]"
  PASS 11. alice 2 championships  => {"championCount":2,"lastPlaceCount":0}
  PASS 12. bob 1 co-championship  => {"championCount":1,"lastPlaceCount":0}
  PASS 13. carol 2 last places  => {"championCount":0,"lastPlaceCount":2}
  PASS 14. no current-period id leaks  => ["alice","bob","carol"]
  PASS 15. empty history -> []  => []
  PASS 16. empty history -> {}  => {}
  PASS 17. only current period has data -> []  => []
  PASS 18. deleted player id still returned  => [1,["ghostId"],["alice"]]

== B. THE FIX: all-tied period is now skipped (was Finding 1) ==
  PASS 19. all-tied 2-player period produces NO result  => []
  PASS 20. all-tied period awards NO trophies  => {}
  PASS 21. all-tied 3-player period also skipped  => []

== C. the guard must NOT over-fire: real ties still resolve ==
  PASS 22. 3-way tie at the top still produces a result  => 1
  PASS 23. ...with all three as co-champions  => ["p","q","r"]
  PASS 24. ...and the distinct last place  => ["s"]
  PASS 25. ...and trophies are awarded to all three  => {"p":{"championCount":1,"lastPlaceCount":0},
        "q":{"championCount":1,"lastPlaceCount":0},"r":{"championCount":1,"lastPlaceCount":0},
        "s":{"championCount":0,"lastPlaceCount":1}}
  PASS 26. tie at the BOTTOM still resolves  => [["x"],["y","z"]]
  PASS 27. ordinary 2-player period unaffected  => [["m"],["n"]]
  PASS 28. 1-point spread still counts (guard is equality, not threshold)  => [["g"],["h"]]

== D. mixed history: skipped period must not shift the others ==
  PASS 29. only the non-degenerate period survives  => ["2023-07-A"]
  PASS 30. and its result is correct  => [["alice"],["bob"]]

30 passed, 0 failed
```

Group B is the blocking fix. Group C is the check I most wanted: assertions 22-25
prove a genuine three-way tie at the top still yields one result with
`championIds.length === 3` and a distinct `lastPlaceIds: ["s"]`, so the confirmed
co-champion tiebreak is intact; 26 proves ties at the bottom still resolve; 27-28
prove an ordinary two-player period and even a one-point spread are untouched.
The guard tests equality, not a threshold. Group D proves a skipped degenerate
period does not disturb the periods around it.

## 8. Finding 1 (blocking) - fixed correctly

`src/lib/honors.ts:39-42`:

```ts
const values = entries.map(([, score]) => score);
const highest = Math.max(...values);
const lowest = Math.min(...values);
if (highest === lowest) return null;
```

with the reasoning recorded in the function comment at L22-L32, which cites the
precedent by file and line:

```
src/lib/honors.ts:26  // tied (highest === lowest). The all-tied case is the per-period analogue of
src/lib/honors.ts:27  // the legacy renderTopStats "allZero" guard
src/lib/honors.ts:28  // (reference/legacy-prototype.sanitized.html:1552-1554, "Hide Top Stats if
src/lib/honors.ts:29  // everyone has 0 score"): scoring is zero-sum (src/lib/scoring.ts), so if
src/lib/honors.ts:30  // every player in a period shares one score, that score can only be 0 -
src/lib/honors.ts:31  // without this guard the same players would be returned as both champion
src/lib/honors.ts:32  // and last place.
```

The cited lines are real and say what the comment says they say:

```
reference/legacy-prototype.sanitized.html:1552    // Hide Top Stats if everyone has 0 score (i.e. just reset)
reference/legacy-prototype.sanitized.html:1553    const allZero = players.every(p => p.totalScore === 0);
```

and the zero-sum claim is backed by the scoring module:

```
src/lib/scoring.ts:8-9    // Net score per player id, already multiplied. Sums to 0 for integer input.
src/lib/scoring.ts:19     // netScore[i] = ( sum over j != i of (raw[i] - raw[j]) ) * multiplier.
```

`renderTopStats` had two guards; both are now ported - `MIN_PLAYERS_FOR_RESULT`
at L20/L37 for L1550, and the equality guard at L42 for L1552-L1554. Placement is
right: it sits after the `entries.length` check and before the two filters, so
`getHallOfFame` drops the period through its existing `if (!ranked) continue`
(L60) and `getTrophyCounts` inherits the exclusion for free. Assertions 19-21 and
22-28 confirm both directions.

One cosmetic leftover: the `getHallOfFame` doc comment at L50-L52 still describes
only the "fewer than two distinct scorers" exclusion and does not mention the
all-tied one. The detailed explanation lives on `rankPeriod` directly above, so
nothing is misleading. Not a fix I would hold a hand-off for.

## 9. Finding 2 (mobile name clipping) - fixed, and verified through the build output

This is the fix the coordinator flagged as unverified, because the live dev DB
has no player who is both trophy-holding and ranked 4th or lower. I verified it
without a browser, from the compiled artefacts.

The source, `src/components/Leaderboard.tsx:333-339`:

```tsx
<span
  className={`flex shrink-0 items-center gap-1 rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-text-muted ${
    championCount > 0 ? "max-sm:hidden" : ""
  }`}
>
  <Ghost className="size-3" /> ผู้ทรงศีล
</span>
```

Step 1 - the conditional really ships, with the condition intact, in the
leaderboard route chunk:

```
$ grep -rl "max-sm:hidden" .next/static/
.next/static/chunks/app/leaderboard/page-ba099ee9c3d731f9.js

$ grep -roh ".\{70\}max-sm:hidden.\{15\}" .next/static/
sed px-2 py-0.5 text-[10px] font-medium text-text-muted ".concat(l>0?"max-sm:hidden":""),children:
```

Step 2 - Tailwind actually generated the utility (a `max-*` variant that the
scanner missed would fail silently, which is the real risk with a conditional
class string):

```
$ grep -o ".\{80\}max-sm.\{120\}" .next/static/css/3d3450a3e77b8181.css
.disabled\:opacity-70:disabled{opacity:.7}@media not all and (min-width:40rem){.max-sm\:hidden{display:none}}@media (min-width:380px){...
```

So the rule that ships is `@media not all and (min-width: 40rem) { display: none }`
- below 640px only. Behaviour that follows:

- No trophy (the common case): condition is false, the class is empty, markup is
  byte-identical to before this diff at every width. Unchanged, as intended.
- Trophy + phone (below 640px): the decorative `ผู้ทรงศีล` pill is removed, so the
  name block keeps roughly 163 - 46 (badge) - 8 (gap) = about 109px instead of the
  ~36px measured in pass one - better than the ~90px it had before the feature
  existed.
- Trophy + iPad (768px portrait) and desktop: both pills show, and there is ample
  width for them.

The badge itself is still `shrink-0` and the name still `truncate` inside
`min-w-0 flex-1` (L329-L332), so overflow remains impossible in every
combination; the fix only relieves the squeeze.

## 10. Findings 4 and 5 (accessibility) - fixed

Finding 4, `src/components/Leaderboard.tsx:532-535`:

```tsx
<div
  role="group"
  aria-label={label}
  className="flex flex-1 flex-wrap items-center gap-2"
>
```

fed from `HallOfFameEntry` with Thai labels (L570, L577 region):

```
label="แชมป์ประจำงวด"          (icon={Crown},        tone="accent")
label="อันดับสุดท้ายประจำงวด"      (icon={TrendingDown}, tone="danger")
```

`label: string` is a required prop on `HonoreeGroup` (L521, L527), so a future
caller cannot silently omit it - the compiler enforces the accessible name. A
screen reader now hears which group it is entering rather than a bare list of
names, which matches the pattern `TrophyBadge` already used at L127.

Finding 5 - the incomplete tablist is gone. `TabSwitcher` now uses the toggle
pattern the sibling `ViewSwitcher` already uses in the same file:

```
$ grep -n "role=\"tab\|aria-selected\|aria-controls\|tabpanel" src/components/Leaderboard.tsx
exit=1 (no matches - none left)

$ grep -n "aria-pressed" src/components/Leaderboard.tsx
430:          aria-pressed={viewKey === currentPeriodKey}
442:          aria-pressed={viewKey === "all"}
498:          aria-pressed={activeTab === key}
```

L430 and L442 are the pre-existing `ViewSwitcher` buttons and L498 is the new
`TabSwitcher` one - the two switchers on this page are now consistent, and no
half-implemented ARIA pattern remains. Choosing consistency over completing the
tablist is the simpler of the two options I offered, and it is the right call
here: these are two view toggles, not a tab widget with panels.

## 11. Findings 3 and 6 - correctly left alone

Finding 3 (`lastPlaceCount` computed but never rendered, `honors.ts:70-83`) and
Finding 6 (the `[history]` memo can lag a period rollover,
`Leaderboard.tsx:661-662`) were both marked "no action needed" in pass one - the
first because it is explicitly in the phase spec, the second because it is
self-healing and matches the wall-clock-at-render pattern Phase 8 shipped.
Re-confirmed both are unchanged and neither affects correctness.

## 12. Nothing else regressed

Re-checked the parts of the feature that already passed in pass one, against the
current file rather than from memory.

**Period badge is still strictly additive.** `Leaderboard.tsx:757`:

```
const showPeriodBadge = isCurrentPeriodView && showRoast;
```

with `isCurrentPeriodView = viewKey === currentPeriod.key` (L654) and the
pre-existing `showRoast = sorted.length >= 2` (L756). Both consumers still fall
back to the original strings at L204 and L291, so all-time, any past period, or a
roster under two players renders `ตัวตึง` / `หมูแจกแต้ม` exactly as before the
feature.

**Deleted player.** `HonoreeGroup` L541-L552 still resolves the id with
`players.find` and renders the avatar only when found, with `(ถูกลบ)` as the name
fallback - the same shape `src/components/History.tsx:78-83` uses:

```
$ grep -n "ถูกลบ" src/components/Leaderboard.tsx src/components/History.tsx
src/components/Leaderboard.tsx:551:              {player ? player.name : "(ถูกลบ)"}
src/components/History.tsx:82:                {player ? player.name : "(ถูกลบ)"}
```

`PlayerAvatar` is never called with a missing player, so nothing dereferences
`player.image` or `player.name`. Assertion 18 proves the engine really does hand
the component an id with no live player, so the branch is reachable.

**Empty state** (`HallOfFame` L608-L613) is unchanged: lucide `Medal`, Thai title
`ยังไม่มีงวดที่จบ`, Thai description, via the shared `StateMessage`. Assertions
15-17 and 19-21 prove it is what renders for a fresh app, for a history with only
current-period rounds, and now also for a history whose only ended period was
degenerate.

**Hooks order** is still safe - the new `role`/`aria` edits touched no hook, all
hooks sit above the first early return, and both `tsc` and lint are silent.

**Firebase data shape and paths** - not touched by this phase, re-verified per the
standing gate. `src/types/models.ts` still declares
`Player { id, name, image, totalScore, latestScore: number | null }` (L4-L13),
`Group { id, name, playerIds: string[], scores: Record<string, number> }`
(L15-L20) and `HistoryEntry { id, timestamp: string, groupName, groupId,
multiplier, playerScores: Record<string, number>, commentary }` (L22-L33),
matching the prototype's own writes at
`reference/legacy-prototype.sanitized.html:517-519` (the three `dummyRoom/*`
refs), `:575` (`playersRef.set(players)`) and `:1114-1115` (`updates` assigning
whole `newPlayers` / `newGroups` arrays). `players` and `groups` are still whole
arrays, never keyed objects, and `normalizeList` in `src/lib/rtdb.ts` still reads
them back through `Object.values`. `src/lib/firebase.ts:30,36-38` still resolves
to `dummyRoom/players`, `dummyRoom/groups` and `dummyRoom/history` when
`NEXT_PUBLIC_RTDB_ROOT` is unset. `honors.ts` reads `timestamp` only through
`getPeriodOfTimestamp` (ISO string, `periods.ts:55`) and `playerScores` only
through `aggregatePeriod` (`leaderboard.ts:18`).

**Theme, language, motion.**

```
$ grep -nE "#[0-9a-fA-F]{3,8}\b" src/lib/honors.ts src/components/Leaderboard.tsx
exit=1 (1 = no match = pass)
```

Only semantic tokens (`bg-accent/20`, `text-accent`, `text-danger`,
`text-text-muted`, `bg-surface`, `bg-surface-raised`, `border-border`,
`text-on-accent`, `shadow-card`, `shadow-gold`). Every new user-facing string is
Thai - including the two new `aria-label`s, which is the right choice for a Thai
UI - and every comment in both files is English. The three fixes added no
keyframes, no animate utility and no inline duration; `max-sm:hidden` is a
display toggle, not motion. The blanket
`@media (prefers-reduced-motion: reduce)` rule at `src/app/globals.css:186-194`
still covers everything the components use (`.reveal`, `transition-colors`).

**Responsive.** The podium rank-1 pill is unchanged from pass one - still capped
by the `w-24 sm:w-28` column with `text-center leading-tight` and a `shrink-0`
icon, so the long Thai label wraps to two lines and cannot overflow; the
`items-end` podium row keeps the three pedestals bottom-aligned regardless. The
Hall of Fame card still stacks `flex-col gap-3 sm:flex-row` with
`flex-1 flex-wrap` groups, so co-champions wrap rather than overflow. The tab
switcher is `w-full` two-up on a phone and `sm:w-fit` above. No fixed pixel width
appears anywhere in the new markup.

## Findings

No blocking findings. Everything raised in pass one is resolved, and the two
items I marked "no action needed" were correctly left alone.

### 1. Observation (no action required) - `getHallOfFame` doc comment is now one exclusion short

`src/lib/honors.ts:50-52` describes the current-period exclusion and the
"fewer than two distinct scorers" exclusion, but not the all-tied one added at
L42. The full reasoning is in the `rankPeriod` comment immediately above
(L22-L32), so nothing is misleading or wrong - it is a one-line doc refresh
whenever that file is next touched.

Previously raised and now closed:

- Finding 1 (BLOCKING, all-tied period crowned everyone as both champion and last
  place) - fixed at `honors.ts:42`; assertions 19-21 prove the degenerate case is
  skipped and 22-28 prove genuine ties still resolve.
- Finding 2 (name clipped to ~36px on a 375px row) - fixed at
  `Leaderboard.tsx:333-336`; verified in the emitted chunk and the emitted CSS.
- Finding 4 (Hall of Fame groups had no accessible name) - fixed at
  `Leaderboard.tsx:532-535` with a compiler-required `label` prop.
- Finding 5 (incomplete ARIA tablist) - replaced by the `aria-pressed` toggle
  pattern already used by `ViewSwitcher`; no `role="tab"` or `aria-selected`
  remains in the file.
- Finding 3 (`lastPlaceCount` unused) and Finding 6 (memo can lag a period
  rollover) - deliberately unchanged, as agreed in pass one.

## Verdict

The blocking defect is genuinely fixed, at the right layer and with the right
scope: one equality guard in `rankPeriod`, placed so both `getHallOfFame` and
`getTrophyCounts` inherit it, carrying a comment that cites the legacy
`allZero` guard by file and line and explains why zero-sum scoring makes
"everyone tied" mean "everyone at zero". 30 of 30 assertions against the current
compiled modules pass, and eight of them exist specifically to prove the guard
does not over-fire: a three-way tie at the top still produces three co-champions
with a distinct last place, bottom ties still resolve, and a one-point spread
still counts. The three non-blocking fixes are all real - the mobile pill toggle
is present in the shipped route chunk with its condition intact and its
`@media not all and (min-width:40rem)` rule present in the shipped CSS, which
closes the gap the coordinator could not test live; the two Hall of Fame groups
carry Thai accessible names through a required prop; and the half-built tablist
was replaced with the toggle pattern the sibling switcher already used rather
than being patched up.

Nothing else regressed. The period badge is still purely conditional, the
deleted-player fallback still matches `History.tsx` and is still provably
reachable, the feature is still pure and read-only with no Firebase import and no
new subscription, and the models, RTDB paths and players/groups array shape are
untouched. Two consecutive clean builds after clearing a stale `.next` (the one
build failure was a `/_not-found` cache artefact from the previous session, not
this diff), `tsc --noEmit` exit 0, lint 0 errors with only the four pre-existing
`no-img-element` warnings, no `any`, no emoji, no raw hex, no new dependency, no
new motion, no fixed width. The single remaining item is a stale doc comment that
contradicts nothing.

PASSED
