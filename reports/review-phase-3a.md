# Code review - Phase 3a (real-time /leaderboard)

Reviewed working tree on branch `claude/realtime-leaderboard-phase-3a-doh6ls`.

Files in scope:

- `src/app/leaderboard/page.tsx` (modified)
- `src/app/globals.css` (modified)
- `src/components/Leaderboard.tsx` (new)
- `src/components/AnimatedNumber.tsx` (new)

Ground truth: `CLAUDE.md` and `reference/legacy-prototype.sanitized.html`
(`renderLeaderboard` line 1425, `renderTopStats` line 1548, `getScoreColorClass`
line 1124, `.rank-1/.rank-2/.rank-3` lines 120-122, RTDB paths lines 517-519).

---

## 1. Commands run, with real output

### 1.1 Working tree scope

```
$ git status
On branch claude/realtime-leaderboard-phase-3a-doh6ls
Changes not staged for commit:
	modified:   src/app/globals.css
	modified:   src/app/leaderboard/page.tsx

Untracked files:
	src/components/AnimatedNumber.tsx
	src/components/Leaderboard.tsx
```

`src/lib/firebase.ts` is fully reverted - the emulator patch left no residue:

```
$ git diff HEAD -- src/lib/firebase.ts
(empty above = identical)
$ git diff --stat HEAD
 src/app/globals.css          | 27 +++++++++++++++++++++++++++
 src/app/leaderboard/page.tsx | 12 ++----------
 2 files changed, 29 insertions(+), 10 deletions(-)
```

Only `globals.css` and `leaderboard/page.tsx` differ from HEAD; `firebase.ts`
is byte-identical to `git show HEAD:src/lib/firebase.ts`.

### 1.2 Build

(The two check-mark glyphs Next.js prints have been transcribed as `[ok]`
to keep this file free of non-ASCII pictographs per the project rule; nothing
else in the output was altered.)

```
$ npm run build
> cosmo999@0.1.0 build
> next build

   ▲ Next.js 15.5.24

   Creating an optimized production build ...
 [ok] Compiled successfully in 2.4s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/9) ...
 [ok] Generating static pages (9/9)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                    9.73 kB         160 kB
├ ○ /_not-found                            996 B         104 kB
├ ○ /groups                                802 B         103 kB
├ ○ /history                               802 B         103 kB
├ ○ /icon.svg                                0 B            0 B
├ ○ /leaderboard                         3.95 kB         154 kB
└ ○ /stats                                 802 B         103 kB
+ First Load JS shared by all             103 kB

○  (Static)  prerendered as static content
```

Build finished with no errors.

### 1.3 Typecheck and lint

```
$ npx tsc --noEmit
TSC_EXIT:0
$ npm run lint

> cosmo999@0.1.0 lint
> eslint
```

Both clean (no diagnostics printed, exit 0).

### 1.4 No `any`

```
$ grep -rnE ": any|as any|<any>|any\[\]" src
EXIT:1
```

Empty output - pass.

### 1.5 No emoji

```
$ LC_ALL=C.UTF-8 grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src .claude/agents CLAUDE.md reports
EXIT:1
```

Empty output - pass. (The prototype uses emoji for the top-stat icons -
a crown emoji at line 1563 and a pig emoji at line 1572 (not reproduced here, per the no-emoji rule). The port correctly replaces them with
lucide-react `Crown` (Leaderboard.tsx:136-137) and `TrendingDown`
(Leaderboard.tsx:202).)

### 1.6 No hardcoded hex outside globals.css

```
$ grep -rnE "#[0-9a-fA-F]{3,8}\b" src --include=*.tsx --include=*.ts
TSX_HEX_EXIT:1
```

Empty - the two new hex values live only in the raw palette scale of
`globals.css` (lines 34-35) and are consumed through semantic tokens
`--color-rank-silver` / `--color-rank-bronze` (lines 62-63).

### 1.7 Read-only - no Firebase writes in the changed files

```
$ grep -nE "\b(set|update|push|runTransaction|remove)\s*\(" src/components/Leaderboard.tsx src/components/AnimatedNumber.tsx src/app/leaderboard/page.tsx
EXIT:1
```

Empty. The only data source is `usePlayers()` (Leaderboard.tsx:17,310), which
uses the read-only `subscribeToList` listener and detaches on unmount
(`src/hooks/usePlayers.ts`, `return unsubscribe`). No import of `lib/players`,
`lib/rounds`, or `firebase/database` in the new files.

### 1.8 No new dependencies

```
$ git diff HEAD -- package.json package-lock.json
(empty = no dep changes)
```

`dependencies` unchanged: canvas-confetti, firebase, lucide-react, next, react,
react-dom.

### 1.9 New Tailwind utilities really exist in the built CSS

```
$ for c in bg-rank-silver bg-rank-bronze pulse-highlight cosmo-score-pulse text-success; do ... grep -o "$c" .next/static/css/*.css; done
bg-rank-silver       bg-rank-silver
bg-rank-bronze       bg-rank-bronze
pulse-highlight      pulse-highlight
cosmo-score-pulse    cosmo-score-pulse
text-success         text-success
```

### 1.10 Data shape / RTDB paths unchanged

`src/types/models.ts` is untouched by this phase and still matches the
prototype:

- models.ts:12 `latestScore: number | null;`
- prototype line 1445
  `<td class="${getScoreColorClass(p.totalScore)}" ...>${p.totalScore > 0 ? '+'+p.totalScore : p.totalScore}</td>`
  (reads `id`, `name`, `image`, `totalScore` off the same objects).

Paths (`src/lib/firebase.ts:32-39`) resolve to the legacy nodes:

```
players: `${RTDB_ROOT}/players`   vs prototype line 517  db.ref('dummyRoom/players')
groups:  `${RTDB_ROOT}/groups`    vs prototype line 518  db.ref('dummyRoom/groups')
history: `${RTDB_ROOT}/history`   vs prototype line 519  db.ref('dummyRoom/history')
```

`dummyRoom/players` is still read as a whole array via `normalizeList`
(`src/lib/rtdb.ts`), never re-keyed. No write path was touched.

### 1.11 Behaviour parity with the prototype

| Behaviour | Prototype | Phase 3a |
| --- | --- | --- |
| Sort | line 1432 `[...players].sort((a, b) => b.totalScore - a.totalScore)` | Leaderboard.tsx:349 `[...players].sort((a, b) => b.totalScore - a.totalScore)` - identical, so negatives sort correctly and ties keep insertion order (`Array.prototype.sort` is stable per spec) |
| Sign format | line 1445 `p.totalScore > 0 ? '+'+p.totalScore : p.totalScore` | `formatSigned` (Leaderboard.tsx:30-32) and AnimatedNumber.tsx:66 - identical |
| Score colour | line 1126 `score >= 0 ? 'score-pos' : 'score-neg'` | `scoreTone` (Leaderboard.tsx:24-28) splits 0 out to `text-text-muted`. Divergence from the prototype but it matches the convention already shipped in this repo (`src/components/PreviewDialog.tsx:19-20`), so it is consistent - accepted |
| Roast card gating | line 1550 `if (players.length < 2) hide` and line 1553-1554 `allZero -> hide` | Leaderboard.tsx:338-347 (allZero state) and :353 `showRoast = sorted.length >= 2` - same gating |
| Lowest player | line 1558 `sorted[sorted.length - 1]` | Leaderboard.tsx:352 - identical |
| Podium colours | lines 120-122 gold / `#94a3b8` / `#b45309` | `bg-accent` / `bg-rank-silver` / `bg-rank-bronze` (Leaderboard.tsx:104,109,114) via tokens |

### 1.12 `latestScore` null/undefined handling

Confirmed still present, using loose equality:

```
src/components/Leaderboard.tsx:79  function LatestScoreLabel({ latestScore }: { latestScore: number | null }) {
src/components/Leaderboard.tsx:84    if (latestScore == null) {
```

so both `null` and the Firebase-dropped `undefined` (see `createPlayer`,
`src/lib/players.ts:30`, writing `latestScore: null`) render
"รอบล่าสุด ยังไม่ได้เล่น" - no `undefined`/`NaN`. Full sweep of every other
consumer:

```
$ grep -rn "latestScore" src
src/types/models.ts:12:  latestScore: number | null;
src/components/Leaderboard.tsx:79,84,92,93,153,241
src/lib/rounds.ts:65:        latestScore: net,
src/lib/players.ts:30:    latestScore: null,
```

`rounds.ts:65` always writes a number, `players.ts:30` writes the initial null.
No other site compares with `=== null`. Pass.

### 1.13 Reduced motion

- `AnimatedNumber.tsx:17-22,35-39` - `matchMedia("(prefers-reduced-motion: reduce)")`
  short-circuits to `setDisplayValue(value)` with no rAF loop. Correct.
- The pulse is a pure CSS animation, so it is covered by the global
  `@media (prefers-reduced-motion: reduce)` block in `globals.css:158-166`
  (`animation-duration: 0.01ms !important`). Correct.

### 1.14 Podium responsiveness at small widths (measured)

The podium columns are `w-24 sm:w-28` inside `main ... px-4 max-w-5xl`. Flex
shrink absorbs the shortfall, so there is no horizontal overflow even at 320px
(measured with a Chromium reproduction of the same box model):

```
viewport 320px -> column widths 88, 88, 88px | horizontal overflow: false
viewport 360px -> column widths 96, 96, 96px | horizontal overflow: false
viewport 375px -> column widths 96, 96, 96px | horizontal overflow: false
```

88px still clears the 80px rank-1 avatar (`size-20`). Names use `truncate`,
rows use `min-w-0 flex-1`. Responsive - pass.

---

## 2. Findings

### Finding 1 (must fix) - the pulse keyframe wipes the element's own background instead of flashing over it

**Where:** `src/app/globals.css:132-143` (`@keyframes cosmo-score-pulse`,
`.pulse-highlight`), applied at `src/components/Leaderboard.tsx:156` (podium
pedestals, which carry `bg-accent` / `bg-rank-silver` / `bg-rank-bronze`),
`:199` (roast card, `bg-surface`) and `:232` (ranked rows, `bg-surface`).

**What is wrong:** the keyframe animates `background-color` itself. While a CSS
animation is running, the animation origin outranks the normal author
declaration, so the element's `bg-*` utility is fully overridden for the whole
520ms - not just at the end. The comment in `globals.css:129-131` only guards
the *post*-animation state (no `fill-mode: both`), which is correct as far as
it goes, but the *during* state is the problem: the pedestal's gold goes to
`alpha 0.3` immediately, decays to effectively transparent within ~100ms
(`--ease-out-soft` is a very front-loaded curve), sits there, then snaps back to
solid. The intended "flash" reads as "the pedestal disappears for half a second
and pops back". Measured in Chromium on an isolated reproduction of the exact
rule against a `background-color: #e6c878` block:

```
before animation : rgb(230, 200, 120)
during (~10ms)   : oklab(0.841199 0.000909001 0.105169 / 0.3)
during (~160ms)  : oklab(0.841199 0.000909001 0.105169 / 0.0400083)
during (~310ms)  : oklab(0.841199 0.000909001 0.105169 / 0.00332583)
during (~510ms)  : oklab(0.841199 0.000909001 0.105169 / 0.0000124789)
after animation  : rgb(230, 200, 120)
```

Rows behave the same way: `bg-surface` is replaced by transparent, so the page
felt shows through the row for most of the pulse.

**Fix:** animate a layer that composites *over* `background-color` instead of
replacing it. `background-image` is the smallest change and needs no markup or
positioning changes (none of these elements set a background image):

```css
@keyframes cosmo-score-pulse {
  from {
    background-image: linear-gradient(
      color-mix(in srgb, var(--color-accent) 30%, transparent),
      color-mix(in srgb, var(--color-accent) 30%, transparent)
    );
  }
  to {
    background-image: linear-gradient(transparent, transparent);
  }
}
```

The `bg-*` utility keeps painting underneath for the whole animation, and the
existing "no fill-mode" reasoning still holds. (An `::after` overlay with an
animated `opacity` is an equally valid fix; do not animate `box-shadow`, since
the pedestals already carry `shadow-card` and would hit the same override
problem.)

### Finding 2 (must fix) - `AnimatedNumber` snaps back to the stale start value when a second live update interrupts a count-up

**Where:** `src/components/AnimatedNumber.tsx:41` (`const from = fromRef.current;`)
and `:53-55` (`fromRef.current = value` only on `progress >= 1`).

**What is wrong:** `fromRef` is advanced only when an animation runs to
completion. If `value` changes while a count-up is in flight, the cleanup at
:59 cancels the frame but leaves `fromRef` holding the *previous* start value,
so the next effect animates from that stale number rather than from what is
currently on screen. The displayed figure visibly jumps backwards. Replaying
the exact effect body (lines 34-60) with a fake clock, first update 0 -> 100
interrupted at 200ms by a second update to 150:

```
snapshot 1: totalScore 0 -> 100 (animation interrupted at 200ms)
  t=  0ms  shown=0
  t=100ms  shown=47
  t=200ms  shown=77
fromRef after interruption = 0 (still stale; only set on completion)
snapshot 2: totalScore 100 -> 150 arrives at t=200ms
  t=  0ms  shown=0     <-- snaps back from 77 to 0
  t=100ms  shown=71
  t=200ms  shown=115
  t=520ms  shown=150
```

This is reachable on this page: it is a live RTDB subscription, and two
snapshots less than 520ms apart (two quick round saves from another device, an
undo right after a save, a save followed by a correction) produce exactly this.

**Fix:** keep `fromRef` in sync with what is actually displayed. Update it in
every tick rather than only at completion:

```ts
function tick(now: number) {
  const progress = Math.min((now - start) / DURATION_MS, 1);
  const next = from + delta * easeOutSoft(progress);
  fromRef.current = next;      // always reflects the value on screen
  setDisplayValue(next);
  if (progress < 1) frame = requestAnimationFrame(tick);
}
```

(then the `fromRef.current = value` at :54 is no longer needed - the final tick
sets it, since `easeOutSoft(1) === 1`).

### Finding 3 (nit, not blocking) - pedestal heights are duplicated between `PODIUM_STYLE` and the skeleton

**Where:** `src/components/Leaderboard.tsx:105,110,115` versus `:293-295`
(`rank === 1 ? "h-28 sm:h-36" : rank === 2 ? "h-20 sm:h-24" : "h-16 sm:h-20"`).

The same three height pairs are written twice, so a podium resize silently
desyncs the loading skeleton. Fix: in the skeleton map over
`([2, 1, 3] as const)` and read `PODIUM_STYLE[rank].height`, which also removes
the nested ternary.

### Finding 4 (note, no action) - "everyone at 0" hides the whole board, where the prototype only hid the top-stat cards

`Leaderboard.tsx:338-347` returns the "ยังไม่มีใครลงมือเล่น" state for the whole
page, while the prototype hid only `topStatsContainer` (line 1554) and still
rendered the all-zero table (line 1428 only special-cases zero *players*). This
is a deliberate divergence requested by the phase brief ("two distinct empty
states"), the Thai copy is real and does not fabricate data, so no change is
required - recorded only so the divergence is not mistaken for a port bug later.

### Finding 5 (note, no action) - podium DOM order is 2, 1, 3

`Leaderboard.tsx:171` renders the visual left-to-right order, so a screen reader
announces second place first. The rank digit is real text inside each pedestal
(`:158`), so the ranking is still conveyed. Acceptable for this phase.

---

## 3. Checklist summary

| Item | Result |
| --- | --- |
| Build (`npm run build`) | Pass - no errors, see 1.2 |
| `npx tsc --noEmit` | Pass - exit 0 |
| `npm run lint` | Pass - no output |
| No `any` | Pass - grep empty |
| No emoji | Pass - grep empty; prototype emoji replaced with lucide icons |
| Icons from lucide-react | Pass - `Crown`, `Spade`, `TrendingDown`, `TriangleAlert`, `Users`, `LucideIcon` |
| No hardcoded hex in components | Pass - hex only in the `globals.css` palette scale |
| Thai UI / English comments | Pass |
| Read-only (no Firebase writes) | Pass |
| No new dependencies | Pass |
| Sorting: negatives, ties | Pass - identical comparator to prototype line 1432, stable sort |
| `latestScore` null/undefined | Pass - loose `== null` at Leaderboard.tsx:84, no other strict-null site |
| Loading / error / empty states | Pass - real Thai copy, no fabricated data |
| `prefers-reduced-motion` | Pass in JS (AnimatedNumber.tsx:35) and CSS (globals.css:158-166) |
| Responsive to 320px | Pass - measured, no overflow |
| Subscription cleanup | Pass - `usePlayers` detaches; pulse timers cleared on unmount (Leaderboard.tsx:69-74) |
| Over-engineering | Pass - one small shared primitive, one local hook, no speculative config |
| Live-update pulse | **Fail - Finding 1** |
| Count-up under rapid updates | **Fail - Finding 2** |

Findings 1 and 2 must be fixed before hand-off.

NOT PASSED
