# Code review - phase 2.5 (app shell, routes, motion foundation)

Reviewer: code-reviewer agent
Date: 2026-08-31
Scope reviewed: working tree on branch `main` (all phase 2.5 changes are still
uncommitted; see `git status` below).

Ground truth read this review: `reference/legacy-prototype.sanitized.html`
(1647 lines). The git-ignored original was opened only to verify the sanitized
copy; all line citations below reference the sanitized file.

---

## 1. Commands run and real output

### 1.1 Working tree under review

```
$ git status --porcelain
 M .claude/agents/code-reviewer.md
 M src/app/globals.css
 M src/app/layout.tsx
 M src/app/page.tsx
 M src/components/MultiplierPicker.tsx
?? .claude/launch.json
?? reference/
?? src/app/groups/
?? src/app/history/
?? src/app/leaderboard/
?? src/app/stats/
?? src/components/AppNav.tsx
?? src/components/PlaceholderPage.tsx

$ git diff --stat
 .claude/agents/code-reviewer.md     | 18 +++++++++---
 src/app/globals.css                 | 50 +++++++++++++++++++++++++++++++++
 src/app/layout.tsx                  | 28 ++++++++++++++++++-
 src/app/page.tsx                    | 47 ++++++++++++++++++-------------
 src/components/MultiplierPicker.tsx | 56 +++++++++++++++++++++++++++++++++----
 5 files changed, 168 insertions(+), 31 deletions(-)
```

Note: `src/hooks/*`, `src/lib/*`, `src/types/models.ts` and `package.json` do
not appear in the diff - the data layer and the dependency list are untouched
this phase, as required.

### 1.2 npm run build

```
$ npm run build

> cosmo999@0.1.0 build
> next build

   Next.js 15.5.24
   - Environments: .env.local

   Creating an optimized production build ...
 Compiled successfully in 3.1s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/9) ...
   Generating static pages (2/9)
   Generating static pages (4/9)
   Generating static pages (6/9)
 Generating static pages (9/9)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
/                                        53.1 kB         156 kB
/groups                                    806 B         103 kB
/history                                   806 B         103 kB
/icon.svg                                    0 B            0 B
/leaderboard                               806 B         103 kB
/_not-found                                993 B         104 kB
/stats                                     806 B         103 kB
+ First Load JS shared by all             103 kB
  chunks/255-c5a697ddbf82d774.js         46.4 kB
  chunks/4bd1b696-c023c6e3521b1417.js    54.2 kB
  other shared chunks (total)            1.99 kB

(Static)  prerendered as static content
```

Build finished with no errors. All five routes exist and prerender statically,
which also proves the four new pages are server components with no client-only
work in them.

### 1.3 npx tsc --noEmit

```
$ npx tsc --noEmit
tsc exit=0
```

(no diagnostics printed)

### 1.4 npm run lint

```
$ npm run lint

> cosmo999@0.1.0 lint
> eslint
```

(no findings printed, exit 0)

### 1.5 any scan

```
$ grep -rnE ": any|as any|<any>|any\[\]" src
exit=1
```

Empty output - pass.

### 1.6 Emoji scan

The literal command in the agent brief fails on this machine default locale, so
it was re-run with a UTF-8 locale:

```
$ grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src .claude CLAUDE.md reports
grep: -P supports only unibyte and UTF-8 locales
exit=2

$ LC_ALL=C.UTF-8 grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src .claude/agents .claude/launch.json CLAUDE.md reports
exit=1
```

Empty output over every project-authored file - pass.

The unrestricted run over all of `.claude` does report hits, but only inside the
vendored third-party skill bundle, which was not touched this phase:

```
$ LC_ALL=C.UTF-8 grep -rlP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" .claude/skills
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

$ git status --porcelain .claude/skills
(empty - unchanged this phase)
```

See finding 7 - informational only, not a phase 2.5 defect.

### 1.7 Raw hex outside the token block

```
$ grep -rnE "#[0-9a-fA-F]{3,8}\b" src --include=*.tsx --include=*.ts
exit=1

$ awk "NR>73 && /#[0-9a-fA-F]{3}/ {print NR}" src/app/globals.css
(empty)
```

Every hex value lives inside `@theme` in `src/app/globals.css` (lines 11-48).
Pass.

### 1.8 STEP 0 - sanitized ground truth

```
$ git check-ignore -v reference/legacy-prototype.sanitized.html
exit=1                      <- NOT ignored, correct

$ git check-ignore -v reference/legacy-prototype.html
.gitignore:48:/reference/legacy-prototype.html	reference/legacy-prototype.html
exit=0                      <- original still ignored, correct

$ git add -n reference/
add "reference/legacy-prototype.sanitized.html"
```

Only the sanitized file would be staged; the original is excluded by
`.gitignore:48` and `/cosmo999-prototype.html` stays ignored on line 49.

```
$ wc -l reference/legacy-prototype.html reference/legacy-prototype.sanitized.html
  1647 reference/legacy-prototype.html
  1647 reference/legacy-prototype.sanitized.html
```

Line counts match exactly. Line-number-only diff:

```
$ diff --unchanged-line-format= --old-line-format="OLD %dn" --new-line-format="NEW %dn" reference/legacy-prototype.html reference/legacy-prototype.sanitized.html
OLD 505
OLD 506
OLD 507
OLD 508
OLD 509
OLD 510
OLD 511
OLD 512
NEW 505
NEW 506
NEW 507
NEW 508
NEW 509
NEW 510
NEW 511
NEW 512
```

Exactly the 8 `firebaseConfig` value lines (505-512) differ, one-for-one, so
every other line number still lines up with the original. The sanitized side of
that diff is:

```
505:            apiKey: "REDACTED",
506:            authDomain: "REDACTED.firebaseapp.com",
507:            databaseURL: "https://REDACTED.firebaseio.com",
508:            projectId: "REDACTED",
509:            storageBucket: "REDACTED.firebasestorage.app",
510:            messagingSenderId: "REDACTED",
511:            appId: "REDACTED",
512:            measurementId: "REDACTED"
```

The original side of that diff is deliberately not reproduced here - it contains
the live API key, and this report is a tracked file.

Secret scan of the sanitized copy:

```
$ grep -nE "AIzaSy|<real-sender-id>|<real-appid-suffix>|<real-measurement-id>|dummy-ae198" reference/legacy-prototype.sanitized.html   # literal secret values used in the pattern, redacted here
exit=1
```

Zero hits for the apiKey prefix, the numeric sender id, the appId suffix, the
measurement id, and even the project id. Pass.

`.claude/agents/code-reviewer.md` was updated correctly (git diff):

```
-Before reviewing anything, read `reference/legacy-prototype.html`. It is the
+Before reviewing anything, read `reference/legacy-prototype.sanitized.html`. It
+is the committed behavioural ground truth for this project - identical to the
+original line for line, with only the string values inside the `firebaseConfig`
+object replaced by `REDACTED` placeholders (the real config carries a live API
+key and stays git-ignored). Cite line numbers against this sanitized file.
+
+If `reference/legacy-prototype.html` also exists on disk (it is git-ignored, so
+a fresh clone or CI will not have it), you may open it to double-check logic,
+but every line-number citation in the report must reference the sanitized file
+that is tracked in the repo.
...
-  `reference/legacy-prototype.html` and from `src/types/models.ts`.
+  `reference/legacy-prototype.sanitized.html` and from `src/types/models.ts`.
```

### 1.9 No new Firebase read or write

```
$ grep -rnE "\b(set|update|push|remove|runTransaction|onValue|ref)\(" src/app src/components
exit=1
```

No direct RTDB call anywhere under `src/app` or `src/components`.
`src/components/AppNav.tsx` and `src/components/PlaceholderPage.tsx` import
nothing from `@/lib` or `@/hooks`. The only subscription on the play page is the
pre-existing `usePlayers()` (`src/app/page.tsx:14`), and `src/hooks/usePlayers.ts`,
`useGroups.ts`, `useHistory.ts`, `src/lib/*` and `src/types/models.ts` are all
absent from `git diff --stat` - unchanged.

Paths are therefore still the legacy ones:

```
src/lib/firebase.ts:30: const RTDB_ROOT = process.env.NEXT_PUBLIC_RTDB_ROOT || "dummyRoom";
src/lib/firebase.ts:33:   players: `${RTDB_ROOT}/players`,
src/lib/firebase.ts:34:   groups:  `${RTDB_ROOT}/groups`,
src/lib/firebase.ts:35:   history: `${RTDB_ROOT}/history`,
```

matching the prototype:

```
reference/legacy-prototype.sanitized.html:517: const playersRef = db.ref("dummyRoom/players");
reference/legacy-prototype.sanitized.html:518: const groupsRef  = db.ref("dummyRoom/groups");
reference/legacy-prototype.sanitized.html:519: const historyRef = db.ref("dummyRoom/history");
```

and the models still match the shapes the prototype writes:

```
reference/legacy-prototype.sanitized.html:610: const newPlayer = { id: Date.now().toString(), name: name, image: "", totalScore: 0, latestScore: null };
src/types/models.ts:4-13:  interface Player { id: string; name: string; image: string; totalScore: number; latestScore: number | null }

reference/legacy-prototype.sanitized.html:939: safeGroups.push({ id: groupIdStr, name: groupNameCombined, playerIds: currentIds, scores: initialScores });
src/types/models.ts:15-20: interface Group { id: string; name: string; playerIds: string[]; scores: Record<string, number> }

reference/legacy-prototype.sanitized.html:953: timestamp: new Date().toISOString(),
src/types/models.ts:22-33: interface HistoryEntry { id: string; timestamp: string; groupName: string; groupId: string; multiplier: number; playerScores: Record<string, number>; commentary: string }
```

Array-shaped writes are still intact
(`reference/legacy-prototype.sanitized.html:1114-1115`:
`updates["dummyRoom/players"] = newPlayers;` /
`updates["dummyRoom/groups"] = newGroups;`) against the comment in
`src/lib/rtdb.ts:6-8`. No keyed-object regression.

### 1.10 Server / client split

`src/app/layout.tsx` line 1 is `import type { Metadata } from "next";` - no
`"use client"` anywhere in the file; it composes `<AppNav />` at line 27.
`src/components/AppNav.tsx` line 1 is `"use client";` and it is the only file
using `usePathname`. Correct.

### 1.11 Motion token consumers

```
$ grep -n -- "duration-fast\|duration-base\|duration-slow\|ease-pop\|ease-out-soft" src/app/globals.css
68:  --ease-pop: cubic-bezier(0.34, 1.56, 0.64, 1);
69:  --ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);
70:  --duration-fast: 140ms;
71:  --duration-base: 260ms;
72:  --duration-slow: 520ms;
89:  animation: cosmo-rise var(--duration-base) var(--ease-out-soft) both;
110:  animation: cosmo-dice-tumble var(--duration-slow) var(--ease-pop) both;
```

`--duration-fast` is declared and never referenced anywhere in `src` (no CSS
reference and no `duration-fast` utility in any `.tsx`). See finding 2.

`.reveal` consumers: `src/app/layout.tsx:32` (shell header),
`src/app/page.tsx:18,49,53` (play page sections),
`src/components/PlaceholderPage.tsx:17` (empty states).
`.dice-tumble` consumer: `src/components/MultiplierPicker.tsx:97`.

### 1.12 Randomize behaviour vs the prototype

```
reference/legacy-prototype.sanitized.html:629-636
        function randomMultiplier() {
            const multipliers = [1, 2, 4, 5, 8, 10, 20];
            const randomIndex = Math.floor(Math.random() * multipliers.length);
            ...
            currentRoundIsRandom = true;
        }

src/components/MultiplierPicker.tsx:11
export const MULTIPLIERS = [1, 2, 4, 5, 8, 10, 20] as const;

src/components/RoundSetup.tsx:42-46
  function randomizeMultiplier() {
    const next = MULTIPLIERS[Math.floor(Math.random() * MULTIPLIERS.length)];
    setMultiplier(next);
    setIsRandom(true);
  }
```

Ladder, uniform pick and the `isRandom` flag match the legacy behaviour. The new
520 ms delay before the value is committed is the presentation change this phase
asked for; the prototype has the same idea in its own flash
(`setTimeout(... 400)` on line 634). Reduced motion is honoured in JS at
`src/components/MultiplierPicker.tsx:17-22` and `49-52` (commits immediately),
and the pending timer is cleared on unmount (lines 39-44) - no leak and no
setState after unmount. Re-entrancy is blocked by the `if (rolling) return;`
guard on line 47.

---

## 2. Findings

1. **Player chips collapse to an unreadable width in the new `lg` two-column
   layout.** `src/app/page.tsx:48` introduces
   `grid gap-6 lg:grid-cols-2 lg:items-start`, but
   `src/components/RoundPlayerSelect.tsx:39` still sizes its own grid off the
   viewport (`grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-3`). At a
   1024 px viewport: 1024 - 240 (`md:w-60` sidebar) - 48 (`sm:px-6`) = 736 px of
   main, minus the 24 px grid gap and halved = 356 px per column, minus `p-5` on
   the `RoundSetup` card = ~314 px, split into three columns with two 8 px gaps =
   ~99 px per chip. Each chip's fixed furniture is `p-2.5` (20) + avatar `size-10`
   (40) + `gap-2` (8) + check badge `size-5` (20) + `gap-2` (8) + borders (2) =
   ~98 px, so the `truncate` name span (line 55) gets 1-2 px and the player name
   disappears. It was fine before this phase because the page was one `max-w-2xl`
   column. Fix: stop keying that grid off the viewport inside the two-column
   region - e.g. `grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3
   lg:grid-cols-1 xl:grid-cols-2` on `RoundPlayerSelect.tsx:39`, or make the
   `RoundSetup` card a `@container` and use container queries. Verify at 1024 px
   and 1280 px.

2. **Dead motion token: `--duration-fast`.** `src/app/globals.css:70` declares
   `--duration-fast: 140ms;` and nothing consumes it - not the CSS in that file,
   not a `duration-fast` utility in any component (evidence in 1.11). The rule
   for this phase is that every motion primitive must have a real consumer, so
   this is speculative config. Fix: delete line 70, or give it the consumer it
   was meant for - `AppNav.tsx:52` (`transition-colors` -> add `duration-fast`)
   and `MultiplierPicker.tsx:75,91` currently fall back to Tailwind's default
   150 ms.

3. **`bottom-0` is never reset when the nav switches to the sidebar.**
   `src/components/AppNav.tsx:42` reads
   `fixed inset-x-0 bottom-0 ... md:sticky md:inset-x-auto md:top-0 md:h-dvh`.
   `md:inset-x-auto` clears left/right but `bottom: 0` survives into the sticky
   state, leaving the box over-constrained (`top: 0` and `bottom: 0` with
   `height: 100dvh`). It happens to render correctly today only because the
   height exactly equals the scrollport, so it is not visible yet, but it is a
   latent trap the moment the sidebar height changes. Fix: add `md:bottom-auto`.

4. **Placeholder copy repeats the phase badge.** `src/app/groups/page.tsx:14`
   ends with "...จะมาในเฟส 4" while `PlaceholderPage` already renders
   "กำลังจะมาในเฟส 4" right underneath (`src/components/PlaceholderPage.tsx:28`).
   Same duplication in `src/app/stats/page.tsx:14` ("จะมาในเฟส 5") and, loosely,
   in `src/app/history/page.tsx:14` ("จะเปิดใช้ในเฟสถัดไป"). The `phase` prop
   exists precisely so the description does not have to say it. Fix: drop the
   trailing phase clause from those descriptions and let the badge carry it.

5. **`env(safe-area-inset-bottom)` is a no-op as configured.**
   `src/components/AppNav.tsx:44` uses
   `[padding-bottom:max(0.25rem,env(safe-area-inset-bottom))]`, but the app never
   exports a `viewport` with `viewportFit: "cover"`, so on iOS the inset always
   resolves to 0 and the expression always collapses to `0.25rem`. Either add
   `export const viewport: Viewport = { viewportFit: "cover" }` to
   `src/app/layout.tsx` and keep the `max()`, or drop the `env()` and use a plain
   `pb-1`. As written it reads as if it does something it does not.

6. **`.claude/launch.json` is config with no demonstrated consumer.** It is new
   this phase and nothing in the repo reads it; CLAUDE.md forbids "config for
   cases that do not exist yet". If the preview tooling genuinely reads
   `.claude/launch.json`, keep it and note which tool consumes it in the phase
   notes; otherwise delete it. Low severity on its own, but it should not be
   handed off unexplained.

7. **Informational, not a phase 2.5 defect:** the unrestricted emoji scan over
   `.claude` reports hits only inside the vendored `.claude/skills/ui-ux-pro-max/**`
   bundle (see 1.6). Those files are third-party data, unchanged this phase, and
   predate it. No action needed now, but the project may want to narrow the emoji
   scan documented in the agent brief to `src .claude/agents CLAUDE.md` so future
   reviews are not noisy.

### Checked and passing (no action)

- `npm run build`, `npx tsc --noEmit`, `npm run lint` all clean (1.2-1.4).
- No `any` in `src` (1.5). No emoji in any project-authored file (1.6).
- No raw hex outside the `@theme` token block (1.7).
- STEP 0 fully satisfied: sanitized file tracked, original still ignored, 1647
  lines on both sides, exactly lines 505-512 differ, zero secret hits (1.8).
- No new Firebase read or write; hooks, lib and models untouched; paths still
  resolve to `dummyRoom/players|groups|history` (1.9).
- `layout.tsx` is a server component, `AppNav.tsx` is the client boundary (1.10).
- Shell: brand bar moved into the layout and shown on every page; pages render
  only their own content; the `usePlayers`-bound connection badge still works on
  the play page (`src/app/page.tsx:28-45`).
- Routes: five real App Router routes, all prerendered; the four new ones are
  honest empty states (icon + short Thai text + phase) with no fabricated data.
- Nav: one component drives both the mobile bottom bar and the md+ sidebar,
  5 items, lucide icons, Thai labels, `aria-current="page"` plus the gold accent
  from `usePathname`; `isActive` correctly special-cases `/`.
- Motion: `.reveal` and `.dice-tumble` both have real consumers this phase; the
  JS dice roll honours `prefers-reduced-motion` itself; the global
  reduced-motion media query (globals.css:126-134) covers the CSS.
- No new dependencies (`package.json` untouched); no toast, counter or sound
  primitives were added.
- Language split holds: user-facing strings are Thai, comments are English.

---

Findings 1 and 2 must be fixed before hand-off - finding 1 is a visible layout
regression introduced by this phase, finding 2 breaks the no-dead-primitive rule
stated for this phase. Findings 3-6 should be folded into the same pass.

Round 1 verdict: NOT PASSED

---

# Re-review (round 2) - after the phase 2.5 fixes

All evidence below was re-collected in this round; nothing is carried over from
round 1.

## 3. Commands run and real output (round 2)

### 3.1 Working tree

```
$ git status --porcelain
 M .claude/agents/code-reviewer.md
 M src/app/globals.css
 M src/app/layout.tsx
 M src/app/page.tsx
 M src/components/MultiplierPicker.tsx
 M src/components/RoundPlayerSelect.tsx
 M src/components/RoundSetup.tsx
?? reference/
?? reports/review-phase-2.5.md
?? src/app/groups/
?? src/app/history/
?? src/app/leaderboard/
?? src/app/stats/
?? src/components/AppNav.tsx
?? src/components/PlaceholderPage.tsx

$ git diff --stat
 .claude/agents/code-reviewer.md      | 20 +++++++++----
 src/app/globals.css                  | 49 +++++++++++++++++++++++++++++++
 src/app/layout.tsx                   | 36 +++++++++++++++++++++--
 src/app/page.tsx                     | 47 +++++++++++++++++-------------
 src/components/MultiplierPicker.tsx  | 56 ++++++++++++++++++++++++++++++++----
 src/components/RoundPlayerSelect.tsx |  2 +-
 src/components/RoundSetup.tsx        |  2 +-
 7 files changed, 177 insertions(+), 35 deletions(-)
```

`.claude/launch.json` no longer appears as untracked - it was deleted
(`ls .claude/` now returns only `agents` and `skills`). `src/hooks`, `src/lib`,
`src/types` and `package.json` are still absent from the diff:

```
$ git status --porcelain src/hooks src/lib src/types package.json
(empty - untouched)
```

### 3.2 npm run build (round 2)

```
$ npm run build
   - Environments: .env.local

   Creating an optimized production build ...
 Compiled successfully in 2.6s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/9) ...
   Generating static pages (2/9)
   Generating static pages (4/9)
   Generating static pages (6/9)
 Generating static pages (9/9)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
/                                        53.1 kB         156 kB
/groups                                    806 B         103 kB
/history                                   806 B         103 kB
/icon.svg                                    0 B            0 B
/leaderboard                               806 B         103 kB
/_not-found                                993 B         104 kB
/stats                                     806 B         103 kB
+ First Load JS shared by all             103 kB
  chunks/255-c5a697ddbf82d774.js         46.4 kB
  chunks/4bd1b696-c023c6e3521b1417.js    54.2 kB
  other shared chunks (total)            1.99 kB

(Static)  prerendered as static content
```

No errors. All five routes still prerender statically.

### 3.3 Type check and lint (round 2)

```
$ npx tsc --noEmit
tsc exit=0

$ npm run lint

> cosmo999@0.1.0 lint
> eslint

lint exit=0
```

### 3.4 Static scans (round 2)

```
$ grep -rnE ": any|as any|<any>|any\[\]" src
exit=1

$ LC_ALL=C.UTF-8 grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src .claude/agents CLAUDE.md reports
exit=1

$ grep -rnE "#[0-9a-fA-F]{3,8}" src --include="*.tsx" --include="*.ts"
exit=1

$ awk "NR>72 && /#[0-9a-fA-F]{3}/ {print NR}" src/app/globals.css
(empty)

$ grep -rnE "\b(set|update|push|remove|runTransaction|onValue|ref)\(" src/app src/components
exit=1

$ ls .claude/
agents
skills
```

All empty. No `any`, no emoji in project-authored files, no raw hex outside the
`@theme` block, and still no direct RTDB call under `src/app` or
`src/components`.

### 3.5 Ground truth file re-verified

```
$ wc -l reference/legacy-prototype.html reference/legacy-prototype.sanitized.html
  1647 reference/legacy-prototype.html
  1647 reference/legacy-prototype.sanitized.html

$ git check-ignore -v reference/legacy-prototype.sanitized.html
check-ignore exit=1 (not ignored, correct)

$ git add -n reference/
add "reference/legacy-prototype.sanitized.html"

$ diff --unchanged-line-format= --old-line-format="OLD %dn " --new-line-format="NEW %dn " reference/legacy-prototype.html reference/legacy-prototype.sanitized.html
OLD 505 OLD 506 OLD 507 OLD 508 OLD 509 OLD 510 OLD 511 OLD 512 NEW 505 NEW 506 NEW 507 NEW 508 NEW 509 NEW 510 NEW 511 NEW 512

$ grep -nE "AIzaSy|<real-sender-id>|<real-appid-suffix>|dummy-ae198" reference/legacy-prototype.sanitized.html   # literal secret values used in the pattern, redacted here
exit=1
```

Unchanged and still clean.

## 4. Verification of each round-1 finding

### 4.1 Finding 1 - chip collapse: FIXED

```
$ git diff src/components/RoundSetup.tsx
-      <div className="flex flex-col gap-2">
+      <div className="@container flex flex-col gap-2">

$ git diff src/components/RoundPlayerSelect.tsx
-    <ul className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-3">
+    <ul className="grid grid-cols-1 gap-2 @[20rem]:grid-cols-2 @[32rem]:grid-cols-3">
```

The grid is now sized by its own container, not the viewport. Confirmed in the
compiled production stylesheet (not just the source):

```
$ CSS=$(ls .next/static/css/*.css | head -1)
$ grep -o "@container[^{]*{" "$CSS" | sort | uniq -c
      1 @container (min-width:20rem){
      1 @container (min-width:32rem){
      1 @container-size{
      1 @container{

$ grep -o "@container[^{]*{[^}]*}" "$CSS" | head -5
@container{container-type:inline-size}
@container-size{container-type:size}
@container (min-width:20rem){.\@\[20rem\]\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}
@container (min-width:32rem){.\@\[32rem\]\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
```

Tailwind v4 core container queries; no plugin was added (`package.json`
untouched). Re-doing the round-1 arithmetic against the container width:

- 1024 px viewport: card inner width is ~314 px, below the 20rem (320 px)
  threshold, so one column - each chip gets the full ~314 px and the name is no
  longer squeezed. This is the case that was broken.
- 1440 px viewport: `main` is capped by `max-w-5xl`, so the card inner width is
  ~436 px - above 20rem, below 32rem - so two columns of ~214 px, leaving
  ~116 px for the name. Matches the in-browser check reported by the coordinator.
- 400 px phone: card inner ~328 px, so two columns, same as the old
  `min-[400px]` behaviour. No mobile regression.
- 375 px phone: ~303 px, one column, same as before.

### 4.2 Finding 2 - dead `--duration-fast`: FIXED

```
$ grep -n "duration" src/app/globals.css
70:  --duration-base: 260ms;
71:  --duration-slow: 520ms;
88:  animation: cosmo-rise var(--duration-base) var(--ease-out-soft) both;
109:  animation: cosmo-dice-tumble var(--duration-slow) var(--ease-pop) both;

$ grep -c "duration-fast" "$CSS"
0
```

Both remaining duration tokens and both easing tokens have a real consumer this
phase (`.reveal` at globals.css:87-89, `.dice-tumble` at 108-110), and
`ROLL_MS = 520` in `src/components/MultiplierPicker.tsx:15` still mirrors
`--duration-slow` with the comment on line 13 pointing at it. No dead motion
primitive remains.

### 4.3 Finding 3 - `bottom-0` not reset: FIXED

```
$ grep -n "md:bottom-auto" src/components/AppNav.tsx
42:      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:sticky md:inset-x-auto md:bottom-auto md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-t-0 md:border-r md:bg-surface/40 md:backdrop-blur-none"

$ grep -o "bottom:auto" "$CSS" | head -2
bottom:auto
```

The sticky sidebar is no longer over-constrained.

### 4.4 Finding 4 - description repeated the phase badge: FIXED

```
$ grep -n "description=" src/app/*/page.tsx
src/app/groups/page.tsx:14:      description="กลุ่มผู้เล่นที่บันทึกไว้ กดครั้งเดียวเริ่มรอบเดิมได้ทันที"
src/app/history/page.tsx:14:      description="รายการรอบที่เล่นไปแล้ว พร้อมปุ่มยกเลิกผลของรอบล่าสุด"
src/app/leaderboard/page.tsx:14:      description="ตารางคะแนนสะสมของทุกคนในวง เรียงจากมากไปหาน้อย"
src/app/stats/page.tsx:14:      description="กราฟคะแนนรายรอบ อัตราชนะ และสถิติรายคนของผู้เล่นแต่ละคน"
```

No description states a phase any more; the single
"กำลังจะมาในเฟส {phase}" pill in `src/components/PlaceholderPage.tsx:28` is the
only place it appears. Copy is still Thai and still an honest empty state.

### 4.5 Finding 5 - safe-area no-op: FIXED

```
$ git diff src/app/layout.tsx
-import type { Metadata } from "next";
+import type { Metadata, Viewport } from "next";
...
+// viewportFit: "cover" lets the bottom tab bar pad itself past the home
+// indicator on notched phones via env(safe-area-inset-bottom).
+export const viewport: Viewport = {
+  viewportFit: "cover",
+};
```

`env(safe-area-inset-bottom)` in `src/components/AppNav.tsx:44` now resolves on
notched devices. No `themeColor` hex was added, so the raw-hex rule still holds
(confirmed by the empty hex grep in 3.4). See observation 8 below for the one
side effect this has.

### 4.6 Finding 6 - `.claude/launch.json`: FIXED

```
$ ls .claude/
agents
skills
```

Deleted. It no longer shows up in `git status` either.

### 4.7 Finding 7 - emoji scan scope: APPLIED

```
$ grep -n "emoji" .claude/agents/code-reviewer.md
46:- Scan for emoji yourself: `grep -rnP "[...]" src .claude/agents CLAUDE.md reports` and paste the result. Scope it to our own files - the vendored `.claude/skills` bundle is third party and out of scope. If `grep -P` errors with an unibyte-locale complaint, re-run it with `LC_ALL=C.UTF-8` prefixed.
```

Scope narrowed and the locale workaround documented, so future reviews get a
clean signal.

### 4.8 Nothing else regressed

```
$ grep -n "use client" src/app/layout.tsx
(exit 1 - absent, correct)

$ grep -n "use client" src/components/AppNav.tsx
1:"use client";
```

`layout.tsx` is still a server component and `AppNav.tsx` is still the only
client boundary for `usePathname`. `src/app/page.tsx`,
`src/components/AppNav.tsx`, `src/components/PlaceholderPage.tsx` and
`src/components/MultiplierPicker.tsx` are byte-identical to round 1 apart from
the fixes listed above, and the reduced-motion media query is still in place at
`src/app/globals.css:125-133`. The RTDB paths, the array-shaped writes and the
`Player` / `Group` / `HistoryEntry` models verified in section 1.9 are unchanged
(no diff in `src/lib`, `src/hooks`, `src/types`).

## 5. Round 2 findings

1. Finding 1 (chip collapse at `lg`) - **fixed and verified**, including in the
   compiled CSS.
2. Finding 2 (dead `--duration-fast`) - **fixed and verified**.
3. Finding 3 (`bottom-0` not reset at `md`) - **fixed and verified**.
4. Finding 4 (description repeated the phase badge) - **fixed and verified**.
5. Finding 5 (safe-area no-op) - **fixed and verified**.
6. Finding 6 (`.claude/launch.json`) - **fixed, file deleted**.
7. Finding 7 (emoji scan scope) - **applied to the agent brief**.
8. **New, non-blocking observation** - `viewportFit: "cover"`
   (`src/app/layout.tsx:22-24`) also extends the layout viewport under the notch
   on the horizontal axis. In portrait, and on iPad, nothing changes. In
   landscape on a notched iPhone the safe-area inset is ~44 px on one side while
   `main` only has `px-4 sm:px-6` (16-24 px) and the bottom bar is `inset-x-0`,
   so the outermost nav item and the edge of the header could sit under the
   notch. Not worth blocking hand-off - the stated targets are portrait phone
   and iPad, and the fix would add complexity for one edge case - but if
   landscape phone use shows up later, the remedy is to pad the shell with
   `env(safe-area-inset-left)` / `env(safe-area-inset-right)` in the same
   `max()` style already used for the bottom inset.

No item requires a change before hand-off.

PASSED
