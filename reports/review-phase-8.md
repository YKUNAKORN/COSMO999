# Code review - phase 8 (UX fixes, uncommitted working tree on `main`)

Third pass, after the two fixes from the previous NOT PASSED verdict were applied.
Scope: the full current uncommitted diff, four files.

```
$ git status --porcelain
 M src/app/page.tsx
 M src/components/PlayerAvatar.tsx
 M src/components/RoundSetup.tsx
 M src/components/ScoreEntry.tsx
?? reports/review-phase-8.md

$ git diff --stat
 src/app/page.tsx                |  5 +++--
 src/components/PlayerAvatar.tsx |  7 ++++++-
 src/components/RoundSetup.tsx   | 44 +++++++++++++++++++++++++++++++++++++----
 src/components/ScoreEntry.tsx   | 10 +++++-----
 4 files changed, 54 insertions(+), 12 deletions(-)
```

Ground truth used: `reference/legacy-prototype.sanitized.html`.

## Commands run and real output

### 1. Build

```
$ npm run build

> cosmo999@0.1.0 build
> next build

   Next.js 15.5.24
   - Environments: .env.local

   Creating an optimized production build ...
   Compiled successfully in 3.9s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/9) ...
   Generating static pages (9/9)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
- /                                      10.4 kB         163 kB
- /groups                                4.91 kB         155 kB
- /history                               3.24 kB         156 kB
- /icon.svg                                  0 B            0 B
- /leaderboard                           3.95 kB         154 kB
- /_not-found                              994 B         104 kB
- /stats                                 5.35 kB         156 kB
+ First Load JS shared by all             103 kB

[exited with code 0]
```

Build finished with no errors and no warnings, in this review.

### 2. Lint (zero warnings allowed)

```
$ npx next lint --max-warnings 0
...
No ESLint warnings or errors
```

### 3. No `any`

```
$ grep -rnE ": any|as any|<any>|any\[\]" src
any-exit:1
```

Empty output - pass.

### 4. Emoji scan

```
$ LC_ALL=C.UTF-8 grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src .claude/agents CLAUDE.md reports
reports/review-phase-3b.md:13:  [U+2713] Compiled successfully in 19.3s
reports/review-phase-3b.md:14:  [U+2713] Linting and checking validity of types
reports/review-phase-3b.md:15:  [U+2713] Generating static pages (9/9)
reports/review-phase-4.md:13:  [U+2713] Compiled successfully in 5.3s
reports/review-phase-4.md:14:  [U+2713] Linting and checking validity of types
reports/review-phase-4.md:15:  [U+2713] Generating static pages (9/9)
reports/review-phase-5.md:13:  [U+2713] Compiled successfully in 4.8s
reports/review-phase-5.md:14:  [U+2713] Linting and checking validity of types
reports/review-phase-5.md:15:  [U+2713] Generating static pages (9/9)
reports/review-phase-6.md:13:  [U+2713] Compiled successfully in 13.5s
reports/review-phase-6.md:14:  [U+2713] Linting and checking validity of types
reports/review-phase-6.md:15:  [U+2713] Generating static pages (9/9)
reports/review-phase-7.md:27:- **[U+2705] Build Passed:** ...
reports/review-phase-7.md:28:- **[U+2705] Type Check Passed:** ...
reports/review-phase-7.md:29:- **[U+2705] Lint Passed:** ...
reports/review-phase-7.md:30:- **[U+2705] Native Confirm/Prompt Avoided:** ...
reports/review-phase-7.md:31:- **[U+2705] Icon/Design Guidelines:** ...

$ LC_ALL=C.UTF-8 grep -rlP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src
src-emoji-exit:1
```

Note: the matched characters are transcribed as `[U+xxxx]` code points on purpose, so
that quoting the scan does not itself plant emoji in a tracked file.

Zero hits in `src`, `.claude/agents` and `CLAUDE.md`. All hits are in `reports/`; the
U+2713 lines are pasted terminal output from earlier reviews, and the five U+2705 in
`reports/review-phase-7.md` are real emoji that predate this diff:

```
$ git log --oneline -1 -- reports/review-phase-7.md
b10857a phase7: responsive/a11y qa + vercel deploy

$ git show HEAD:reports/review-phase-7.md | grep -cP "[\x{2705}]"
5
```

### 5. The two previously required fixes

```
$ git diff src/components/PlayerAvatar.tsx
-        className={`${className} shrink-0 rounded-full border border-border bg-cover bg-center`}
+        // block so the size-* width/height apply even when the span is not a
+        // flex item (e.g. wrapped inside PodiumCard); a bare inline span
+        // collapses to zero width, and inline-block would add baseline strut
+        // that throws the rank-1 gold ring off. Matches the block-level
+        // no-image branch below.
+        className={`${className} block shrink-0 rounded-full border border-border bg-cover bg-center`}
```

Finding 1 from the previous pass is resolved. `src/components/PlayerAvatar.tsx:25` now
uses `block`, so at the podium (`src/components/Leaderboard.tsx:141-143`, the only call
site where the avatar is not a flex item) the wrapper span no longer establishes an
inline formatting context, there is no strut and no baseline descender, and the
`rounded-full shadow-gold` ring - `0 0 0 1px var(--color-gold-600), 0 0 20px rgba(230,
200, 120, 0.15)` at `src/app/globals.css:72` - is drawn on a border box exactly the
size of the avatar. That matches the reported browser measurement of
`extraHeightBelowAvatar: 0` and a 96x96 wrapper around a 96x96 avatar. It also brings
the image branch in line with the no-image branch at
`src/components/PlayerAvatar.tsx:33`, which is `flex` and therefore already
block-level. At the other ten call sites the avatar is a direct flex item, where
`block` and the previous absent-display both resolve to `block` after flex
blockification, so nothing changes there; `shrink-0` is unaffected by the display
value. The default `className` is `size-11 text-lg`
(`src/components/PlayerAvatar.tsx:10`), so a block-level avatar always has an explicit
width and can never stretch to its container.

```
$ git diff src/components/RoundSetup.tsx   (comment hunk)
+  // Roster order for the picker only: oldest / never-played first, the most
+  // recently played sink to the bottom so the group that just finished a
+  // round is right above the action button. The -1 sentinel puts
+  // never-played players above anyone with a real (positive) play time, and
+  // sort() is stable so same-round ties keep their original roster order.
   const orderedPlayers = useMemo(() => {
     const lastPlayed = lastPlayedByPlayer(history);
     return [...players].sort((a, b) => {
       const aTime = lastPlayed[a.id] ?? -1;
       const bTime = lastPlayed[b.id] ?? -1;
       return aTime - bTime;
     });
   }, [players, history]);
```

Finding 2 is resolved: the duplicated stability note is gone and the single block
comment at `src/components/RoundSetup.tsx:64-68` is accurate. The comparator returns a
finite number for every input, so it can no longer produce `NaN`.

## Ground-truth checks against the legacy prototype

**History shape read by the new helper.** `lastPlayedByPlayer`
(`src/components/RoundSetup.tsx:29-41`) reads `entry.timestamp` and the keys of
`entry.playerScores`. Legacy write, `reference/legacy-prototype.sanitized.html:951-959`:

```
                currentData.history[matchId] = {
                    id: matchId,
                    timestamp: new Date().toISOString(),
                    groupName: safeGroups[gIndex].name,
                    groupId: groupIdStr,
                    multiplier: tempMultiplier,
                    playerScores: tempNetScores,
                    commentary: roundCommentary
                };
```

`src/types/models.ts:22-33`:

```
export interface HistoryEntry {
  id: string;
  timestamp: string;
  groupName: string;
  groupId: string;
  multiplier: number;
  playerScores: Record<string, number>;
  commentary: string;
}
```

`timestamp` is an ISO 8601 string, so `new Date(entry.timestamp).getTime()` parses it
correctly, and the `Number.isNaN(time)` guard skips a malformed row rather than
poisoning the map.

`playerScores` is keyed by player id. Legacy
`reference/legacy-prototype.sanitized.html:768-774`:

```
            selectedPlayerIds.forEach(id => {
                const input = document.getElementById(`score_${id}`);
                tempRawScores[id] = input ? (parseInt(input.value) || 0) : 0;
            });
            const result = calculateRoundScores(selectedPlayerIds, tempRawScores, tempMultiplier);
            tempNetScores = result.netScores;
```

so `Object.keys(entry.playerScores)` really does yield player ids, matching `Player.id`
in `src/types/models.ts:5`. The defensive `?? {}` mirrors the legacy
`Object.entries(log.playerScores || {})` at
`reference/legacy-prototype.sanitized.html:1023` and `:1063`.

**Score parsing preserved.** Legacy `reference/legacy-prototype.sanitized.html:770` is
`tempRawScores[id] = input ? (parseInt(input.value) || 0) : 0;`. New code,
`src/components/ScoreEntry.tsx:34-37`, is untouched by this diff:

```
function parseScore(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}
```

Empty string, a lone minus sign and junk all still resolve to 0 exactly as legacy did,
and "-300" yields -300. The zero-sum guard (`src/components/ScoreEntry.tsx:104-109`)
still mirrors `reference/legacy-prototype.sanitized.html:778-781`. The only deviation
from legacy is the widget type: legacy uses
`<input type="number" id="score_${id}" class="score-input-field" placeholder="0">`
(`reference/legacy-prototype.sanitized.html:710`); the new code uses `type="text"` with
no `inputMode`. That is the intended mobile-keyboard fix; it changes only which soft
keyboard iOS offers, never what is written to Firebase.

**Firebase paths, writes and array shape untouched.** The diff contains no write, no
path and no model change. `src/lib/firebase.ts:30-39` still resolves to
`dummyRoom/players`, `dummyRoom/groups`, `dummyRoom/history` when
`NEXT_PUBLIC_RTDB_ROOT` is unset or `dummyRoom`, matching
`reference/legacy-prototype.sanitized.html:517-519`. Players and groups are still read
as arrays through `normalizeList` (`src/lib/rtdb.ts:14-25`); nothing here turns them
into keyed objects, so the phase-2 transaction logic is unaffected.

**Subscriptions.** No new listener. `src/app/page.tsx:19` already called `useHistory()`
for `LatestRoundCard`; the same array and its loading flag are now also used by
`RoundSetup`. `useHistory` still detaches on unmount (`src/hooks/useHistory.ts:31-32`)
and its error path sets `loading` to `false` (`src/hooks/useHistory.ts:26-29`), so the
`loading={loading || historyLoading}` gate cannot strand the picker on a permanent
spinner if the history read fails.

**Order-dependence audit.** Only `RoundPlayerSelect` receives `orderedPlayers`
(`src/components/RoundSetup.tsx:209`). The preset filters, `validSelectedIds` and the
`handleProceed` snapshot all still use the unsorted `players` and are id-based or
count-based, so the reorder cannot change round contents, score-entry order, or what is
saved.

**Types, language, responsive.** No `any` anywhere. Every new comment is English. No
user-facing string was added or changed, so the Thai UI is unaffected. No fixed pixel
width was introduced; the picker grid is still container-query driven
(`src/components/RoundPlayerSelect.tsx:39`) and the podium keeps its `sm:` breakpoint
sizes (`src/components/Leaderboard.tsx:103-118`).

## Findings

1. Resolved - `src/components/PlayerAvatar.tsx:25`. The previous blocking finding
   (`inline-block` left a baseline strut that made the rank-1 gold ring about 7px
   taller than the avatar) is fixed by using `block`, and the comment now explains the
   reason. No further action.

2. Resolved - `src/components/RoundSetup.tsx:64-68`. The duplicated sort-stability
   comment was merged into one accurate block comment. No further action.

3. `src/components/RoundSetup.tsx:34` versus `src/components/LatestRoundCard.tsx:44` -
   non-blocking, style consistency, carried over and knowingly deferred.
   `playerScores` is guarded three ways across the codebase: `?? {}` (RoundSetup),
   `|| {}` (LatestRoundCard) and direct indexing (`src/lib/stats.ts:51`,
   `src/lib/commentary.ts:49`, `src/components/History.tsx:71`). All three are safe
   against the legacy data and none can throw, so this does not gate the hand-off.
   Whenever those files are next touched, settle on one convention.

4. `reports/review-phase-7.md:27-31` - pre-existing, outside this diff, knowingly
   deferred. Five U+2705 emoji in a tracked file violate the "no emoji anywhere" hard
   rule in `CLAUDE.md`. `git log` and `git show` confirm they were committed in
   `b10857a` (phase 7), not by this change. Fix in a separate housekeeping commit by
   replacing the markers with plain text such as "PASS -".

Nothing in the four changed files requires a change before hand-off.

## Verdict rationale

All four files were re-read in full and re-checked against the prototype. The score
input keeps legacy parsing semantics while allowing a negative raw score to be typed on
iOS; the picker ordering is derived from history with a finite comparator, is confined
to the picker, and cannot affect what is saved; the loading gate is correct on both the
success and the error path of the history listener; and the avatar now sizes correctly
in both flex and non-flex contexts with no side effect on the podium ring. `npm run
build` was run in this review and finished with exit code 0, no errors and no warnings.
Lint is clean at zero warnings, `grep` for `any` is empty, and there is no emoji in
`src`, `.claude/agents` or `CLAUDE.md`. Findings 3 and 4 are pre-existing, outside the
four files this task touches, and explicitly non-blocking.

PASSED
