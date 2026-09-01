# Code review - phase 2c (score entry, scoring math, preview dialog)

Reviewer: code-reviewer agent
Date: 2026-08-31

Scope reviewed:
- `src/lib/scoring.ts` (new)
- `src/components/ScoreEntry.tsx` (new)
- `src/components/PreviewDialog.tsx` (new)
- `src/components/RoundSetup.tsx` (edited)
- `src/app/globals.css` (edited)

Ground truth: `reference/legacy-prototype.sanitized.html`
(`calculateRoundScores` L745-761, `setupScoreInput` L694-741,
`showPreview` and the preview modal L763-814).

---

## 1. Commands run and real output

### 1.1 Working tree under review

```
$ git log --oneline -3
b897c9f phase2.5: design foundation + app shell
7ef1c98 phase2b: round play setting
b35f99f bugfix: config .gitignore

$ git status --short
 M src/app/globals.css
 M src/components/RoundSetup.tsx
?? .claude/launch.json
?? src/components/PreviewDialog.tsx
?? src/components/ScoreEntry.tsx
?? src/lib/scoring.ts
```

### 1.2 Build

```
$ npm run build

> cosmo999@0.1.0 build
> next build

   Next.js 15.5.24
   - Environments: .env.local

   Creating an optimized production build ...
 [ok] Compiled successfully in 2.7s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/9) ...
 [ok] Generating static pages (9/9)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
  /                                      54.7 kB         157 kB
  /groups                                  806 B         103 kB
  /history                                 806 B         103 kB
  /icon.svg                                  0 B            0 B
  /leaderboard                             806 B         103 kB
  /_not-found                              993 B         104 kB
  /stats                                   806 B         103 kB
+ First Load JS shared by all             103 kB

(Static)  prerendered as static content
```

Build finished with no errors in this review. The box-drawing and check
characters in the real Next.js output are transcribed as ASCII above; nothing
else is altered.

### 1.3 Types and lint

```
$ npx tsc --noEmit
tsc exit 0

$ npx eslint src
eslint exit 0
```

### 1.4 No `any`

```
$ grep -rnE ": any|as any|<any>|any\[\]" src
(exit 1)
```

Empty output - pass.

### 1.5 No emoji

```
$ LC_ALL=C.UTF-8 grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src .claude/agents CLAUDE.md reports
(exit 1)
```

Empty output - pass. The vendored `.claude/skills/` bundle is third party and
out of scope, so it is not in the scanned paths.

### 1.6 No Firebase writes in this phase

```
$ grep -rnE "\.set\(|\.update\(|\.push\(|runTransaction|\.remove\(" src
src/lib/players.ts:2:// as the legacy app writes it via playersRef.set(players). Every mutation
```

The single hit is a pre-existing comment in `src/lib/players.ts`, not a call.
None of `ScoreEntry.tsx`, `PreviewDialog.tsx`, `scoring.ts` imports anything
from `src/lib/firebase.ts`.

### 1.7 No raw hex outside the token file

```
$ grep -rnE "#[0-9a-fA-F]{3,8}\b" src --include=*.ts --include=*.tsx
(no output)
```

The only new hex is the raw palette entry inside the token block:

```
$ git diff src/app/globals.css
+  --color-emerald-400: #3ecf7f;
...
+  /* Positive movement: a winning chip, a score gained. Distinct from accent
+     (gold, used for controls) so a plus figure never reads as a button. */
+  --color-success: var(--color-emerald-400);
```

and it reaches the bundle as a semantic utility:

```
$ grep -roE "\.text-success\{[^}]*\}" .next/static/css/
.next/static/css/29f0b50bd923f1ce.css:.text-success{color:var(--color-success)}
```

### 1.8 Scoring math: differential test against the legacy function

The legacy body was copied verbatim from
`reference/legacy-prototype.sanitized.html` L745-761 and run against the real
`src/lib/scoring.ts` (imported directly, not re-implemented) over 20000
randomised rounds: 2-7 players, raw scores -30..30, 10 percent of raw scores
deliberately missing to exercise the `|| 0` branch, multipliers 1/2/4/5/8/10/20.

```
$ node --experimental-strip-types <scratchpad>/cmp.mts
random differential runs: 20000, mismatches: 0
10/-4/-6 x2 => {"netScores":{"a":60,"b":-24,"c":-36},"totalNetScore":0,"hasPositive":true}
7/-3 x1 => {"netScores":{"a":10,"b":-10},"totalNetScore":0,"hasPositive":true}
12/-4/-8 x1 => {"netScores":{"a":36,"b":-12,"c":-24},"totalNetScore":0,"hasPositive":true}
missing raw (b absent) x1 => {"netScores":{"a":5,"b":-5},"totalNetScore":0,"hasPositive":true}
```

Zero mismatches, and the three numbers the implementer reported from the browser
reproduce exactly.

### 1.9 Preview dialog width really applies (responsive check)

`w-[min(28rem,calc(100vw-2rem))]` is authored without spaces around the minus.
That exact string is invalid CSS, so this was checked in a real Chromium engine
instead of assumed:

```
$ msedge --headless=new --dump-dom <scratchpad>/supports.html
min(28rem,calc(100vw-2rem)) => false | min(28rem,calc(100vw - 2rem)) => true
```

The build normalises it, so the shipped rule is valid:

```
$ grep -oE ".{0,50}width:min\(28rem.{0,40}" .next/static/css/29f0b50bd923f1ce.css
dth:200px}.w-\[min\(28rem\,calc\(100vw-2rem\)\)\]{width:min(28rem,100vw - 2rem)}.w-full{width:100%}.max-w
```

Rendering the real dialog markup against the built stylesheet confirms the
declaration wins over the UA `width: fit-content`:

```
$ msedge --headless=new --window-size=375,800 --dump-dom <scratchpad>/dlg.html
viewport=492 dialogWidth=448 computedWidth=448px maxWidth=calc(100% - 38px)
(768 and 1280 runs identical: computedWidth=448px)
```

448px is 28rem, so the dialog is capped at 28rem and falls back to
`100vw - 2rem` on narrower screens. No other fixed widths in the new code; the
only fixed size is the `w-24` score field, which fits a 320px row beside a
truncating name.

Other responsive utilities emitted as expected:

```
$ grep -oE "[^{}]{0,60}flex-row-reverse[^{}]{0,40}\{[^}]*\}" .next/static/css/29f0b50bd923f1ce.css
.sm\:flex-row-reverse{flex-direction:row-reverse}

$ grep -oE "[^{}]{0,60}::backdrop\{[^}]*\}" .next/static/css/29f0b50bd923f1ce.css | head -2
.backdrop\:bg-black\/60::backdrop{background-color:#0009}
.backdrop\:bg-black\/60::backdrop{background-color:color-mix(in oklab,var(--color-black) 60%,transparent)}
```

### 1.10 Focus behaviour of the preview dialog

The two close strategies were measured in the same engine. Case A is what the
current code does on X, on "กลับไปแก้" and on a backdrop click (the parent
state setter unmounts the still-open `<dialog>`); case B calls `dialog.close()`
first.

```
$ msedge --headless=new --dump-dom <scratchpad>/focus.html
A unmount-while-open activeElement=BODY | B close()-first activeElement=check
```

See finding 1.

### 1.11 No confetti, commentary or alert() in this phase

```
$ grep -rniE "alert\(|confetti|commentary|roast" src
src/components/ScoreEntry.tsx:92:    // the win confetti (result.hasPositive) and the round commentary. Phase
src/lib/scoring.ts:15:  // phase 2d (it decides whether to fire the win confetti), not dead code -
src/types/models.ts:32:  commentary: string;
```

Only the two forward-looking comments and the long-standing `HistoryEntry`
field. No `alert()` call, no confetti, no roast code.

```
$ grep -rn "TODO" src
src/components/ScoreEntry.tsx:91:    // TODO(phase-2d): atomic write of players + groups + history, then fire
```

One TODO, in the confirm stub, exactly as the phase brief describes.

---

## 2. Legacy parity, line by line

### 2.1 calculateRoundScores

Prototype, `reference/legacy-prototype.sanitized.html:750-759`:

```
pIds.forEach(id1 => {
    let sumDifference = 0;
    pIds.forEach(id2 => {
        if (id1 !== id2) sumDifference += ((rawScoresObj[id1] || 0) - (rawScoresObj[id2] || 0));
    });
    let fScore = sumDifference * multi;
    nScores[id1] = fScore;
    tScore += fScore;
    if (fScore > 0) hasPos = true;
});
```

Port, `src/lib/scoring.ts:32-45`:

```
for (const selfId of playerIds) {
    let sumDifference = 0;
    for (const otherId of playerIds) {
      if (selfId !== otherId) {
        sumDifference += (rawScores[selfId] || 0) - (rawScores[otherId] || 0);
      }
    }
    const finalScore = sumDifference * multiplier;
    netScores[selfId] = finalScore;
    totalNetScore += finalScore;
    if (finalScore > 0) hasPositive = true;
}
```

Same formula, same `|| 0` fallback, same return triple
(`{ netScores, totalNetScore, hasPositive }`, prototype L760). The function is
pure: no DOM, no module state, no Firebase import. `hasPositive` is documented
at `src/lib/scoring.ts:14-17` as the phase 2d confetti input, so it is part of
the ported contract rather than stray dead code.

### 2.2 Raw score parsing

Prototype L770: `tempRawScores[id] = input ? (parseInt(input.value) || 0) : 0;`
Port, `src/components/ScoreEntry.tsx:17-20`: `Number.parseInt(value, 10)` with
NaN mapped to 0. Same coercion, including empty field to 0 and a lone `-` to 0.

### 2.3 Score input behaviour

Prototype L722-729 (Enter moves to the next player, last field blurs) maps to
`ScoreEntry.tsx:56-62`. Prototype L736-739 (focus the first field) maps to
`ScoreEntry.tsx:44-47`. One field per selected player, in selection order, as
in prototype L700-731. Negative entry works because the field is
`type="text" inputMode="numeric"`, with the reason spelled out in the comment at
`ScoreEntry.tsx:121-126`.

The player list is a snapshot: `RoundSetup.handleProceed`
(`src/components/RoundSetup.tsx:61-71`) resolves `validSelectedIds` into `Player`
objects once and stores them in `roundPlayers`, and `ScoreEntry` scores exactly
that array. A roster delete during entry cannot inject or drop an id. This is
stricter than the prototype, which re-read the live `players` and
`selectedPlayerIds` globals at preview time (L768, L787), and it is the right
call.

### 2.4 Zero-sum guard

Prototype L778-781 pops a browser `alert` and returns. The port,
`ScoreEntry.tsx:79-84`, blocks the preview and renders an inline Thai message in
a `role="alert"` element (`ScoreEntry.tsx:145-152`); there is no `alert()`
anywhere (section 1.11). The guard runs before `setChecked(...)`, so the dialog
cannot open on a non-zero total. Comments at `ScoreEntry.tsx:76-78` and
`scoring.ts:10-12` correctly describe it as a defensive assertion that integer
input can never trip.

### 2.5 Preview contents

Prototype L784-806 renders a multiplier header `ตัวคูณ: x{n}`, one row per
player with `ดิบ: {raw}` and `สุทธิ: {sign}{net}`, the net coloured success /
danger / muted, then a total row. The port renders the same four things at
`PreviewDialog.tsx:72-122`. The colour rule in `netTone`
(`PreviewDialog.tsx:17-21`) matches L789 (positive success, negative danger,
zero muted) and the `+` sign rule matches L790. The legacy person emoji at L794
is correctly replaced by the shared `PlayerAvatar`. `ยืนยันและบันทึก` is a stub
(`ScoreEntry.tsx:90-94`) whose body is only the TODO, so pressing it cannot
persist anything.

### 2.6 Data shape and RTDB paths (unchanged this phase, re-verified)

`src/types/models.ts:4-33` still declares `Player` (`id`, `name`, `image`,
`totalScore`, `latestScore: number | null`), `Group` (`id`, `name`,
`playerIds: string[]`, `scores: Record<string, number>`) and `HistoryEntry`
(`id`, `timestamp: string`, `groupName`, `groupId`, `multiplier`,
`playerScores`, `commentary`). `src/lib/firebase.ts:30-36`:

```
const RTDB_ROOT = process.env.NEXT_PUBLIC_RTDB_ROOT || "dummyRoom";

export const DB_PATHS = {
  players: `${RTDB_ROOT}/players`,
  groups: `${RTDB_ROOT}/groups`,
  history: `${RTDB_ROOT}/history`,
} as const;
```

resolves to `dummyRoom/players`, `dummyRoom/groups`, `dummyRoom/history` when
the env var is unset or `dummyRoom`. `src/lib/players.ts` still writes the whole
players array with `set(...)`, matching the prototype's
`playersRef.set(players)`, so the array shape the phase 2 transaction logic
depends on is intact. Phase 2c touches none of this.

---

## 3. Findings

1. **MEDIUM (blocking) - `src/components/PreviewDialog.tsx:63-65`, `:79-86`,
   `:133-139` - closing the preview with X, with "กลับไปแก้", or by clicking
   the backdrop loses keyboard focus.** All three handlers call the `onClose`
   prop directly. `onClose` is `() => setChecked(null)`
   (`src/components/ScoreEntry.tsx:180`), which unmounts `<PreviewDialog>`, so
   the still-open `<dialog>` element is removed from the DOM and `close()` never
   runs. The HTML focus-restore step lives inside `close()`, not in the node
   removal steps, so focus falls back to `<body>` and a keyboard or
   screen-reader user is dumped at the top of the document. Measured in Chromium
   (section 1.10): unmount-while-open gives `activeElement=BODY`, close-first
   gives `activeElement=check`. The Esc path is fine only because the browser
   closes the dialog itself before the `close` event reaches `onClose`. Phase
   acceptance item 4 explicitly requires focus return.
   Fix: route every dismissal through the element and let the platform restore
   focus, for example add
   `const dismiss = () => dialogRef.current?.close();` and use it for the X
   button, for "กลับไปแก้" and in the backdrop check, keeping
   `onClose={onClose}` on the `<dialog>` as the one place that clears parent
   state. An equivalent fix is an unmount cleanup in the existing effect:
   `return () => { if (dialog.open) dialog.close(); };`.

2. **LOW (blocking, same edit) - `src/components/PreviewDialog.tsx:31`, `:45-52`
   - the `open` prop and its `false` branches are dead code.** The only caller
   mounts the component conditionally and always passes the literal `open`
   (`src/components/ScoreEntry.tsx:173-182`), so `open` is never `false` while
   the component is mounted: `if (!open) return null` (line 52) and
   `if (!open && dialog.open) dialog.close()` (line 49) are unreachable. Two
   gates for one piece of state is the speculative flexibility the project rules
   rule out. Fix: drop the prop and both branches and keep a mount effect that
   calls `showModal()` - the `!dialog.open` guard is still worth keeping for
   Strict Mode double invocation. Doing this alongside finding 1 leaves one
   obvious close path.

3. **INFO - `src/components/ScoreEntry.tsx:90-94` - the confirm stub is
   silent.** `ยืนยันและบันทึก` runs an empty function, so the dialog just sits
   there. That is exactly what this phase asked for (nothing persisted) and the
   TODO names phase 2d, so no change now. Worth remembering that the button
   needs a disabled or pending state the moment 2d wires the write, or a double
   tap will double-write.

4. **INFO - `src/components/ScoreEntry.tsx:132-133` - `inputMode="numeric"`
   shows a digits-only keypad on iOS, with no minus key.** Negative raw scores
   are normal in this game and the project targets phone and iPad first. It is
   not a regression: the prototype's `type="number"` (L710) has the same iOS
   limitation, and the comment above the input correctly explains why
   `type="number"` was rejected, so it is out of scope for 2c. If iPad entry
   turns out to be painful, the cheap options are `inputMode="text"` or a small
   plus/minus toggle beside the field.

5. **INFO - `src/components/PreviewDialog.tsx:63-65` - dragging a text selection
   from the panel out onto the backdrop closes the dialog.** The `click` target
   is the dialog element in that case, so the guard cannot distinguish it from a
   real backdrop click. Harmless here - the raw scores live in `ScoreEntry`
   state and survive - and the usual mousedown/mouseup target pairing is more
   machinery than this screen needs. Noted only so the trade-off is known.

---

## 4. Checklist summary

| Item | Result |
| --- | --- |
| Build (`npm run build`, run in this review) | Pass, no errors |
| `npx tsc --noEmit`, `npx eslint src` | Pass, both exit 0 |
| No `any` | Pass, grep empty |
| No emoji in `src`, `.claude/agents`, `CLAUDE.md`, `reports` | Pass, grep empty |
| Icons from lucide-react only | Pass (ClipboardCheck, ArrowLeft, ArrowRight, Play, Check, X) |
| Thai UI text, English comments | Pass |
| Theme tokens, no raw hex outside `globals.css` | Pass, new `--color-success` consumed as `text-success` |
| Scoring formula vs prototype L745-761 | Pass, 20000-case differential, 0 mismatches |
| Raw parse `|| 0` parity (L770) | Pass |
| Enter-to-next and first-field focus (L722-739) | Pass |
| Player snapshot taken at proceed time | Pass, stricter than legacy and correct |
| Zero-sum guard before preview, inline Thai `role="alert"` | Pass, no `alert()` |
| Preview contents and colour rules (L784-806) | Pass |
| Dialog Esc close, backdrop close, `aria-labelledby` | Pass |
| Dialog focus return on every close path | Fail, finding 1 |
| No Firebase writes, no confetti, no commentary | Pass |
| Data shape and RTDB paths unchanged | Pass |
| Responsive, 320px to desktop | Pass, dialog capped at 28rem and fluid below, verified in emitted CSS and a rendered measurement |
| Over-engineering | One item, finding 2 (dead `open` prop branches) |

The maths, the port fidelity, the type safety and the build are all in good
shape. Two small items in `PreviewDialog.tsx` must change before hand-off, and
the same short edit to the close path fixes both.

Round-1 verdict: NOT PASSED (findings 1 and 2). Fixes reviewed below.

---

## 5. Round 2 - re-review after the fix

Changed since round 1: `src/components/PreviewDialog.tsx` (dead `open` prop and
its branches removed, mount effect with cleanup, single `dismiss()` used by
every dismissal path) and the matching prop removal in
`src/components/ScoreEntry.tsx`. Nothing else moved: `src/lib/scoring.ts:23-46`
and `ScoreEntry.handleCheck` / `handleConfirm` (`ScoreEntry.tsx:64-94`) are
byte-for-byte what round 1 verified, so the section 1.8 differential result and
the section 2 parity findings still stand.

### 5.1 Commands run in round 2

```
$ npm run build
   Collecting page data ...
   Generating static pages (0/9) ...
 [ok] Generating static pages (9/9)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
  /                                      54.7 kB         157 kB
  /groups                                  806 B         103 kB
  /history                                 806 B         103 kB
  /icon.svg                                  0 B            0 B
  /leaderboard                             806 B         103 kB
  /_not-found                              993 B         104 kB
  /stats                                   806 B         103 kB
+ First Load JS shared by all             103 kB

(Static)  prerendered as static content
```

Build finished with no errors in this round as well.

```
$ npx tsc --noEmit
tsc exit 0

$ npx eslint src
eslint exit 0

$ grep -rnE ": any|as any|<any>|any\[\]" src
any-grep exit 1

$ LC_ALL=C.UTF-8 grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src .claude/agents CLAUDE.md reports
emoji-grep exit 1

$ grep -rnE "\.set\(|\.update\(|\.push\(|runTransaction|\.remove\(" src
src/lib/players.ts:2:// as the legacy app writes it via playersRef.set(players). Every mutation

$ grep -rn "open" src/components/PreviewDialog.tsx src/components/ScoreEntry.tsx
src/components/PreviewDialog.tsx:7:// platform rather than hand-rolled. Mounted only while the preview is open
src/components/PreviewDialog.tsx:47:    if (!dialog.open) dialog.showModal();
src/components/PreviewDialog.tsx:49:      if (dialog.open) dialog.close();
```

No `any`, no emoji, no Firebase writes, and the only remaining `open`
occurrences are reads of the DOM property plus one comment - the prop is gone
from both files.

### 5.2 Finding 1 re-tested in Chromium

The new `dismiss()` order (`PreviewDialog.tsx:58-61`: `close()` while the node
is still connected, then the parent unmount) and the StrictMode
close-then-reopen cycle were replayed against the real element:

```
$ msedge --headless=new --dump-dom <scratchpad>/focus2.html
A button-dismiss activeElement=check modalNodes=0 |
B esc-dismiss activeElement=check modalNodes=0 |
C strictmode open=true isModal=true |
C after dismiss activeElement=check modalNodes=0
```

- A - X button, "กลับไปแก้" and backdrop click all route through `dismiss()`:
  focus returns to the trigger (`activeElement=check`, was `BODY` in round 1)
  and the dialog node is gone.
- B - Esc reaches `onCancel` (`PreviewDialog.tsx:66-69`), which calls
  `preventDefault()` and then the same `dismiss()`, so it behaves identically
  instead of relying on the native close. Suppressing the default is also what
  makes it safe to leave the `close` event unwired.
- C - the effect's `if (!dialog.open) dialog.showModal()` /
  `if (dialog.open) dialog.close()` pair survives React's development
  mount-unmount-mount: after the cycle the dialog is still `open` and still
  matches `:modal`, so no double `showModal()` throw and no non-modal fallback.

Not wiring a React `onClose` to the `close` event is correct here: the
StrictMode cleanup fires `close` while the preview must stay open, and every
real dismissal already clears the parent state through `dismiss()`. There is no
path left that can close the dialog without telling the parent.

Finding 1 - fixed and verified.

### 5.3 Finding 2 re-checked

`PreviewDialog` now takes `players`, `rawScores`, `result`, `multiplier`,
`onClose`, `onConfirm` (`PreviewDialog.tsx:24-38`) - no `open`, no unreachable
`return null`, no unreachable `close()` branch. `ScoreEntry.tsx:173-181` still
mounts it only when `checked` is set, so the single gate is the conditional
render. The effect is a plain mount/unmount pair with `[]` deps.

Finding 2 - fixed and verified.

### 5.4 Findings 3, 4 and 5

Unchanged by design and still informational, as agreed:

- 3 - `ยืนยันและบันทึก` is still the silent phase 2d stub
  (`ScoreEntry.tsx:90-94`, body is only the TODO); the confirm button is
  correctly still wired to `onConfirm`, not to `dismiss`, so pressing it keeps
  the dialog open and persists nothing.
- 4 - `inputMode="numeric"` still hides the minus key on the iOS phone keypad;
  same constraint as the prototype's `type="number"` (L710), so no regression.
- 5 - a drag-select ending on the backdrop still dismisses; entered scores
  survive in `ScoreEntry` state.

### 5.5 Round-2 checklist

| Item | Result |
| --- | --- |
| Build (`npm run build`, re-run this round) | Pass, no errors |
| `npx tsc --noEmit`, `npx eslint src` | Pass, both exit 0 |
| No `any`, no emoji | Pass, both greps empty |
| No Firebase writes, no confetti, no commentary | Pass, only the pre-existing comment |
| Scoring math and parse parity (unchanged files) | Pass, as verified in 1.8 and 2.1-2.2 |
| Dialog focus return on every dismissal path | Pass, finding 1 fixed |
| Esc handling with the native close suppressed | Pass |
| StrictMode remount safety | Pass, still open and `:modal` after the cycle |
| Dead code / over-engineering | Pass, finding 2 fixed, no `open` prop left |
| Responsive, Thai UI, English comments, tokens only | Pass, unchanged from round 1 |

Both blocking findings are fixed, the fix is the minimal one, and the build ran
clean in this round.

PASSED
