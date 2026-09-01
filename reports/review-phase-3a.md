# Code review - Phase 3a (real-time /leaderboard) - re-review after fixes

Re-review of branch `claude/realtime-leaderboard-phase-3a-doh6ls` at commit
`c97a82d` ("Fix leaderboard code-review findings: pulse and count-up
interruption"), which addresses Findings 1, 2 and 3 of the first pass.

Files in scope:

- `src/app/globals.css`
- `src/app/leaderboard/page.tsx`
- `src/components/Leaderboard.tsx`
- `src/components/AnimatedNumber.tsx`

Ground truth: `CLAUDE.md` and `reference/legacy-prototype.sanitized.html`.

---

## 1. Commands run, with real output

### 1.1 Working tree scope and `src/lib/firebase.ts` residue

```
$ git status
On branch claude/realtime-leaderboard-phase-3a-doh6ls
Your branch is up to date with 'origin/claude/realtime-leaderboard-phase-3a-doh6ls'.

nothing to commit, working tree clean

$ git log --oneline -5
c97a82d Fix leaderboard code-review findings: pulse and count-up interruption
d668dd0 Phase 3a: real-time leaderboard with podium and juice
6e66bc1 Merge pull request #1 from YKUNAKORN/claude/atomic-save-confetti-roast-hu2efq
8f63f43 Clean up stale comments flagged in phase 2d review
1df0b55 Fix code-reviewer findings on phase 2d round save

$ git diff -- src/lib/firebase.ts
FIREBASE_DIFF_EXIT:0
$ git diff HEAD -- src/lib/firebase.ts
HEAD_DIFF_EXIT:0
$ git diff --stat HEAD
(no output)
```

Empty diffs above: the manual-QA patch to `src/lib/firebase.ts` is fully
reverted and the tree is clean. Nothing is uncommitted.

Scope of the fix commit (report file aside, only the three intended files):

```
$ git show --stat c97a82d
 reports/review-phase-3a.md        | 401 ++++++++++++++++++++++++++++++++++++++
 src/app/globals.css               |  17 +-
 src/components/AnimatedNumber.tsx |  16 +-
 src/components/Leaderboard.tsx    |   6 +-
 4 files changed, 427 insertions(+), 13 deletions(-)
```

### 1.2 Build

(The two check-mark glyphs Next.js prints are transcribed as `[ok]` to keep
this file free of non-ASCII pictographs per the project rule; nothing else in
the output was altered.)

```
$ npm run build
> cosmo999@0.1.0 build
> next build

   Next.js 15.5.24

   Creating an optimized production build ...
 [ok] Compiled successfully in 6.8s
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
/                                        9.73 kB         160 kB
/_not-found                                996 B         104 kB
/groups                                    802 B         103 kB
/history                                   802 B         103 kB
/icon.svg                                    0 B            0 B
/leaderboard                            3.95 kB         154 kB
/stats                                     802 B         103 kB
+ First Load JS shared by all             103 kB
  chunks/255-c5a697ddbf82d774.js         46.4 kB
  chunks/4bd1b696-c023c6e3521b1417.js    54.2 kB
  other shared chunks (total)            1.96 kB

BUILD_EXIT:0
```

Build finished with no errors, in this review.

### 1.3 Typecheck and lint

```
$ npx tsc --noEmit
TSC_EXIT:0
--- LINT ---
$ npm run lint

> cosmo999@0.1.0 lint
> eslint

LINT_EXIT:0
```

Both clean (no diagnostics printed, exit 0).

### 1.4 No `any`

```
$ grep -rnE ": any|as any|<any>|any\[\]" src
ANY_EXIT:1
```

Empty output - pass.

### 1.5 No emoji

```
$ LC_ALL=C.UTF-8 grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src .claude/agents CLAUDE.md reports
EMOJI_EXIT:1
```

Empty output - pass. Commit messages too:

```
$ git log -6 --format="%s%n%b" | LC_ALL=C.UTF-8 grep -nP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]"
COMMIT_EMOJI_EXIT:1
```

Empty - the `c97a82d` message is ASCII only. Icons still come from
lucide-react (`Crown`, `Spade`, `TrendingDown`, `TriangleAlert`, `Users`,
`LucideIcon` - `Leaderboard.tsx:7-14`), replacing the prototype's crown and
pig emoji in `renderTopStats`.

### 1.6 No hardcoded hex outside the globals.css palette

```
$ grep -rnE "#[0-9a-fA-F]{3,8}\b" src --include=*.tsx --include=*.ts
HEX_EXIT:1

$ grep -nE "#[0-9a-fA-F]{3,8}\b" src/app/globals.css
11:  --color-felt-950: #06140d;
12:  --color-felt-900: #0a2318;
13:  --color-felt-800: #0e3423;
14:  --color-felt-700: #14472f;
15:  --color-felt-600: #1c5c3d;
17:  --color-gold-300: #f4e4b6;
18:  --color-gold-400: #e6c878;
19:  --color-gold-500: #c9a24b;
20:  --color-gold-600: #a17c33;
22:  --color-crimson-400: #e0454f;
23:  --color-crimson-500: #c62330;
24:  --color-crimson-600: #9c1622;
26:  --color-ivory-50: #f6f2e6;
27:  --color-ivory-200: #d9d3c1;
28:  --color-ivory-400: #a8a291;
30:  --color-emerald-400: #3ecf7f;
34:  --color-silver-400: #c7cdd6;
35:  --color-copper-500: #c17a4b;
```

Every hex is confined to the raw palette scale in the `@theme` block. The new
pulse keyframe uses `color-mix(in srgb, var(--color-accent) 35%, transparent)`
- a token, not a literal. Pass.

### 1.7 Read-only - no Firebase writes in the changed files

```
$ grep -nE "\b(set|update|push|runTransaction|remove)\s*\(" src/components/Leaderboard.tsx src/components/AnimatedNumber.tsx src/app/leaderboard/page.tsx src/app/globals.css
WRITE_EXIT:1
```

Empty. The single data source is `usePlayers()` (`Leaderboard.tsx:17,308`),
which wraps the read-only `subscribeToList` listener and detaches on unmount
(`src/hooks/usePlayers.ts:31-32` `// Detach the listener on unmount. return
unsubscribe;`). Pulse timers are still cleared on unmount
(`Leaderboard.tsx:69-74`).

---

## 2. Verification of the three previous findings

### 2.1 Finding 1 (pulse wiped the element's own background) - RESOLVED

`src/app/globals.css:127-150` now reads:

```css
@keyframes cosmo-score-pulse {
  from {
    background-image: linear-gradient(
      color-mix(in srgb, var(--color-accent) 35%, transparent),
      color-mix(in srgb, var(--color-accent) 35%, transparent)
    );
  }
  to {
    background-image: linear-gradient(transparent, transparent);
  }
}

.pulse-highlight {
  animation: cosmo-score-pulse var(--duration-slow) var(--ease-out-soft);
}
```

Three things make this correct, and all three are verified against the built
CSS rather than assumed:

1. The animation now targets `background-image`, a *different* property from
   the one the element's own utility sets. The utilities in question compile
   to `background-color` alone, so the animation origin can no longer outrank
   them:

   ```
   $ grep -o "\.bg-accent{[^}]*}" .next/static/css/*.css
   .bg-accent{background-color:var(--color-accent)}
   $ grep -o "\.bg-rank-silver{[^}]*}" .next/static/css/*.css
   .bg-rank-silver{background-color:var(--color-rank-silver)}
   $ grep -o "\.bg-surface{[^}]*}" .next/static/css/*.css
   .bg-surface{background-color:var(--color-surface)}
   ```

2. Per CSS Backgrounds 3 painting order, the background color is painted
   first and background images are painted on top of it, so the gradient
   composites as an overlay flash and the gold/silver/bronze/surface base
   stays visible for the whole 520ms.

3. No pulsed element sets a background image of its own that the animation
   could clobber - the three call sites are `Leaderboard.tsx:156`
   (`${style.pedestal} ${style.height}`, i.e. `bg-accent` / `bg-rank-silver` /
   `bg-rank-bronze`), `:199` (`bg-surface`) and `:232` (`bg-surface`). There
   is no `bg-gradient-*` / `bg-linear-*` utility on any of them, and the
   `from`/`to` gradients have matching stop counts so they interpolate
   smoothly.

The emitted rule matches the source, so the toolchain did not mangle the
`color-mix`:

```
$ grep -o "@keyframes cosmo-score-pulse{...}" .next/static/css/*.css
@keyframes cosmo-score-pulse{0%{background-image:linear-gradient(color-mix(in srgb,var(--color-accent) 35%,transparent),color-mix(in srgb,var(--color-accent) 35%,transparent))}to{background-image:linear-gradient(#0000,#0000)}}
$ grep -o "\.pulse-highlight{[^}]*}" .next/static/css/*.css
.pulse-highlight{animation:cosmo-score-pulse var(--duration-slow) var(--ease-out-soft)}
```

The deliberate absence of a `fill-mode` is still correct and now doubly safe:
after the run, `background-image` reverts to `none` and the element is back to
its plain `bg-*` colour. The explanatory comment at `globals.css:127-135` is
accurate English prose, no emoji.

No browser was available in this environment (`chromium` / `puppeteer` /
`playwright` are not installed), so the confirmation above is by CSS
specification plus the built-CSS evidence; it is consistent with the
`getComputedStyle` trace reported by the implementer, in which
`background-color` on the rank-1 pedestal stayed `rgb(230, 200, 120)` for the
entire pulse.

### 2.2 Finding 2 (`AnimatedNumber` snapped back on an interrupted count-up) - RESOLVED

`src/components/AnimatedNumber.tsx:31-68` now mirrors the displayed value in
`displayRef` on every tick and hands it to `fromRef` in the effect cleanup:

```ts
const displayRef = useRef(0);
const fromRef = useRef(0);
...
function tick(now: number) {
  const progress = Math.min((now - start) / DURATION_MS, 1);
  const next = from + delta * easeOutSoft(progress);
  displayRef.current = next;
  setDisplayValue(next);
  if (progress < 1) {
    frame = requestAnimationFrame(tick);
  }
}

frame = requestAnimationFrame(tick);
return () => {
  cancelAnimationFrame(frame);
  fromRef.current = displayRef.current;
};
```

The cleanup runs both on interruption by a new `value` and on unmount, so
`fromRef` can no longer go stale. The three early-return paths stay
consistent: the reduced-motion branch sets both refs (`:39-44`), and the
`delta === 0` branch (`:48`) returns without a cleanup, which is correct
because in that case `fromRef` already equals what is on screen.

I replayed the exact effect body (lines 38-68) against a fake clock,
reproducing React's ordering where the previous effect's cleanup runs before
the next effect:

```
$ node sim.mjs
scenario: 500 -> 600, interrupted at 200ms by 600 -> 700
  settled at 500 fromRef = 500
  trace: 500 -> 514 -> 526 -> 537 -> 547 -> 556 -> 564 -> 571 -> 571 -> 589 -> 605 -> 619
         -> 632 -> 643 -> 653 -> 662 -> 670 -> 676 -> 682 -> 686 -> 690 -> 693 -> 695
         -> 697 -> 698 -> 699 -> 700 -> 700 -> 700 -> 700
  monotonic non-decreasing: true | final: 700
scenario: unmount-safe + reverse direction 700 -> 400 interrupting 400 -> 700
  trace: 400 -> 441 -> 478 -> 512 -> 542 -> 569 -> 569 -> 545 -> 524 -> 506 -> 489 -> 474
         -> 461 -> 449 -> 439 -> 431 -> 424 -> 418 -> 413 -> 409 -> 406 -> 404 -> 402
         -> 401 -> 400 -> 400 -> 400 -> 400 -> 400
  final: 400
```

The first trace is monotonically non-decreasing across the interruption at
571 (the old code snapped back to the previous start). The second trace shows
a direction reversal handed off cleanly from 569 rather than from the stale
400, and both converge exactly on the target. Matches the implementer's
browser trace.

### 2.3 Finding 3 (duplicated pedestal heights) - RESOLVED

`src/components/Leaderboard.tsx:288-294` now maps `([2, 1, 3] as const)` and
reads `PODIUM_STYLE[rank].height`, so the skeleton cannot desync from the real
podium and the nested ternary is gone. `as const` narrows the literals to
`1 | 2 | 3`, which is what indexes `PODIUM_STYLE` - hence the clean `tsc`
run, with no `any` and no assertion.

---

## 3. Regression sweep on the surrounding code

Nothing outside the three edited files changed (`git diff --stat HEAD` is
empty and `c97a82d` touched only those three plus the report), and the items
checked in the first pass still hold:

- Data shape. `src/types/models.ts` is untouched by this phase.
  `models.ts:12` `latestScore: number | null;` still matches the prototype,
  which reads `id`, `name`, `image`, `totalScore` off the same objects -
  prototype line 1445:
  `<td class="${getScoreColorClass(p.totalScore)}" ...>${p.totalScore > 0 ? '+'+p.totalScore : p.totalScore}</td>`.
  `Group` (`models.ts:15-20`) and `HistoryEntry` (`:22-33`, ISO-string
  `timestamp`) are unchanged and still match `CLAUDE.md`.
- RTDB paths. `src/lib/firebase.ts:30-39`
  `const RTDB_ROOT = process.env.NEXT_PUBLIC_RTDB_ROOT || "dummyRoom";` with
  `players: ${RTDB_ROOT}/players`, `groups: ${RTDB_ROOT}/groups`,
  `history: ${RTDB_ROOT}/history` versus prototype lines 517-519
  `db.ref('dummyRoom/players')`, `db.ref('dummyRoom/groups')`,
  `db.ref('dummyRoom/history')`. Unset or `dummyRoom` resolves identically;
  the `||` (not `??`) keeps an empty env var from resolving at the DB root.
  `players` is still read as a whole array through `normalizeList`, never
  re-keyed into an object, so the phase-2 transaction shape is preserved.
- Sort / tie / negative-score parity. `Leaderboard.tsx:347`
  `[...players].sort((a, b) => b.totalScore - a.totalScore)` versus prototype
  line 1432 `const sortedPlayers = [...players].sort((a, b) => b.totalScore - a.totalScore);`
  - character-for-character the same comparator, so negatives order correctly
  and ties keep insertion order (`Array.prototype.sort` is stable per spec).
  Sign formatting (`formatSigned`, `:30-32`; `AnimatedNumber.tsx:74`) still
  matches prototype line 1445. Lowest player `sorted[sorted.length - 1]`
  (`:350`) matches prototype line 1558; roast gating `sorted.length >= 2`
  (`:351`) matches prototype line 1550.
- `latestScore` null handling. `Leaderboard.tsx:84` `if (latestScore == null)`
  - loose equality, so both `null` and the Firebase-dropped `undefined`
  render "รอบล่าสุด ยังไม่ได้เล่น". Untouched by this commit.
- Thai UI / English comments. All new and edited strings are Thai
  (`กำลังโหลดอันดับ...`, `เชื่อมต่อกระดานคะแนนไม่ได้`, `ยังไม่มีผู้เล่น`,
  `ยังไม่มีใครลงมือเล่น`, `หมูแจกแต้ม`, `อันดับ`); every comment added in
  `c97a82d` (globals.css:127-135, AnimatedNumber.tsx:32-34) is English.
- Responsive. The edit did not touch any width or breakpoint. The podium is
  still `w-24 sm:w-28` inside `max-w-5xl px-4` with flex shrink, names
  `truncate`, rows `min-w-0 flex-1` - measured clean to 320px in the first
  pass, and the skeleton now inherits the same `h-*` classes as the real
  podium instead of its own copies.
- Reduced motion. `AnimatedNumber.tsx:39-44` still short-circuits with no rAF
  loop, and the pulse remains a pure CSS animation covered by the global
  `@media (prefers-reduced-motion: reduce)` block at `globals.css:165-173`.
- Over-engineering. The fix adds one ref and swaps one CSS property; no new
  abstraction, no new config, no new dependency. `PODIUM_STYLE` now has
  exactly one consumer per field.

---

## 4. Findings

### Finding 1 (note, no action) - loading skeleton uses one avatar size for all three slots

`src/components/Leaderboard.tsx:290` renders `size-16 ... sm:size-20` for
every slot, while the real rank-1 avatar is `size-20 text-2xl sm:size-24`
(`PODIUM_STYLE[1].avatar`). Only the pedestal heights were deduplicated. This
is a purely cosmetic difference in a placeholder that is on screen for one
RTDB round-trip, the heights (which drive the layout) are now shared, and
pushing the avatar size through the map too would add indirection for no user
-visible gain. Recorded, not blocking.

### Finding 2 (note, no action) - "everyone at 0" hides the whole board

`Leaderboard.tsx:336-345` returns the "ยังไม่มีใครลงมือเล่น" state for the
whole page, where the prototype hid only `topStatsContainer` (line 1554) and
still rendered the all-zero table. Deliberate divergence requested by the
phase brief; the copy is real and fabricates no data. Unchanged since the
first pass, recorded so it is not mistaken for a port bug later.

### Finding 3 (note, no action) - podium DOM order is 2, 1, 3

`Leaderboard.tsx:171` renders visual left-to-right order, so a screen reader
announces second place first. The rank digit is real text inside each pedestal
(`:158`), so the ranking is still conveyed. Acceptable for this phase.

No must-fix items remain.

---

## 5. Checklist summary

| Item | Result |
| --- | --- |
| Build (`npm run build`) | Pass - exit 0, no errors, see 1.2 |
| `npx tsc --noEmit` | Pass - exit 0 |
| `npm run lint` | Pass - exit 0, no output |
| No `any` | Pass - grep empty |
| No emoji (source, agents, CLAUDE.md, reports, commit messages) | Pass - grep empty |
| Icons from lucide-react | Pass |
| No hardcoded hex outside the palette | Pass |
| Thai UI / English comments | Pass |
| Read-only (no Firebase writes) | Pass - grep empty |
| `src/lib/firebase.ts` QA patch reverted | Pass - `git diff` empty, tree clean |
| No new dependencies | Pass - `git diff --stat HEAD` empty |
| Firebase model shape / RTDB paths vs prototype 517-519, 1432, 1445 | Pass |
| `players`/`groups` still whole arrays, not re-keyed | Pass |
| Sorting: negatives, ties | Pass - identical comparator, stable sort |
| `latestScore` null/undefined | Pass - loose `== null` |
| `prefers-reduced-motion` | Pass - JS and CSS |
| Responsive to 320px / iPad | Pass - no width or breakpoint changed |
| Subscription and timer cleanup | Pass |
| Over-engineering | Pass |
| Previous Finding 1 - pulse overlay | **Fixed** - see 2.1 |
| Previous Finding 2 - interrupted count-up | **Fixed** - see 2.2 |
| Previous Finding 3 - duplicated heights | **Fixed** - see 2.3 |

PASSED
