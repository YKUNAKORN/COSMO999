# Review - Phase 13 (feedback link on the post-save screen)

Scope - the uncommitted working tree:

```
$ git status --short
 M src/components/ScoreEntry.tsx
```

One source file. No new dependency, no schema change, no new state, hook or
config. Ground truth: `reference/legacy-prototype.sanitized.html` has no
feedback link, so this is a pure addition with no prototype behaviour to port.

The diff:

```
$ git diff
@@ -6,7 +6,14 @@
-import { ArrowLeft, ClipboardCheck, Flame, PartyPopper, RotateCcw } from "lucide-react";
+import {
+  ArrowLeft,
+  ClipboardCheck,
+  Flame,
+  MessageSquareHeart,
+  PartyPopper,
+  RotateCcw,
+} from "lucide-react";
@@ -157,6 +164,16 @@ export function ScoreEntry({
           <RotateCcw className="size-4" />
           เริ่มรอบใหม่
         </button>
+        <a
+          href="https://forms.gle/BicBxvKyLrqoQHj89"
+          target="_blank"
+          rel="noopener noreferrer"
+          aria-label="แจ้งปัญหา / เสนอไอเดีย (เปิดในแท็บใหม่)"
+          className="flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-muted transition-colors hover:border-border-strong hover:text-text"
+        >
+          <MessageSquareHeart className="size-4" />
+          แจ้งปัญหา / เสนอไอเดีย
+        </a>
       </section>
```

---

## 1. Build

```
$ npm run build
./src/components/RoundSetup.tsx
242:13  Warning: Using `<img>` could result in slower LCP ...  @next/next/no-img-element
   Collecting page data ...
   Generating static pages (0/9) ...
 ✓ Generating static pages (9/9)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                    11.1 kB         164 kB
├ ○ /groups                              4.91 kB         155 kB
├ ○ /history                             3.24 kB         156 kB
├ ○ /icon.svg                                0 B            0 B
├ ○ /leaderboard                         7.49 kB         158 kB
├ ○ /_not-found                            994 B         104 kB
└ ○ /stats                               5.37 kB         156 kB
+ First Load JS shared by all             103 kB

○  (Static)  prerendered as static content

build exit=0
```

Clean build. The only warnings are the pre-existing `no-img-element` ones; none
point at `ScoreEntry.tsx`. `/` grew from 10.8 kB to 11.1 kB (one icon + one link).

## 2. Type check and lint of the changed file

```
$ npx eslint src/components/ScoreEntry.tsx
lint exit=0

$ npx tsc --noEmit
tsc exit=0
```

## 3. No `any`

```
$ grep -rnE ": any|as any|<any>|any\[\]" src
any exit=1 (1 = no match = pass)
```

## 4. No emoji

```
$ LC_ALL=C.UTF-8 grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src .claude/agents CLAUDE.md
emoji exit=1 (1 = no match = pass)
```

The icon is the lucide `MessageSquareHeart` component; the export exists in the
installed package:

```
$ grep -o 'MessageSquareHeart' node_modules/lucide-react/dist/lucide-react.d.ts | head -1
MessageSquareHeart
```

## 5. Theme tokens, no hardcoded hex

```
$ git diff -U0 | grep -nE "#[0-9a-fA-F]{3,8}\b"
hex exit=1 (1 = no match = pass)

$ grep -n "border-strong\|--color-text-muted\|--color-text:\|--color-border\|--color-surface:" src/app/globals.css
39:  --color-surface: var(--color-felt-900);
41:  --color-border: var(--color-felt-700);
42:  --color-border-strong: var(--color-gold-600);
44:  --color-text: var(--color-ivory-50);
45:  --color-text-muted: var(--color-ivory-400);
```

Every class on the link resolves to a defined semantic token. The class string
is the same secondary-button recipe already used elsewhere:

```
$ grep -rn "hover:border-border-strong" src | head -5
src/components/Groups.tsx:96:  ... rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:border-border-strong hover:text-text
src/components/Groups.tsx:103: ... (same recipe)
src/components/ConfirmDialog.tsx:137: ... border border-border bg-surface px-4 py-2.5 ... hover:border-border-strong
src/components/GroupScoreDialog.tsx:145: ... border border-border bg-surface px-4 py-2.5 ... hover:border-border-strong
src/components/CreatePlayerForm.tsx:68: ... border border-border bg-surface-raised ... hover:border-border-strong
```

So the link reads as a secondary action beneath the gold primary `เริ่มรอบใหม่`
button, which is the right visual hierarchy.

## 6. Correctness

- Placement: the link sits inside the `saveState.status === "saved"` branch
  (`src/components/ScoreEntry.tsx:148-178`), which is only reached after
  `outcome.committed` is true (L135-L145). It therefore shows only after a round
  was actually saved - exactly "after a player finishes a round".
- `target="_blank"` is paired with `rel="noopener noreferrer"`, so the opened
  form cannot reach `window.opener`.
- It is a plain `<a>`, not a `next/link`, which is correct for an external URL.
- No state, effect, subscription or Firebase call was added; nothing to clean up
  and no RTDB path touched. Models (`src/types/models.ts`) and the
  `dummyRoom/players` / `dummyRoom/groups` array shape are untouched.
- The URL is used once, inline. Not extracting it into a constant or config is
  the right call under the no-over-engineering rule.

## 7. Language split

User-facing text `แจ้งปัญหา / เสนอไอเดีย` is Thai. No comments were added, so the
English-only comment rule is not engaged.

## 8. Responsive

The parent section is `flex flex-col items-center`, so the link sizes to its
content (about 190px for a 14px Thai label plus icon and `px-4`) and is centred,
matching the primary button above it. That fits comfortably inside the card on a
320-375px phone (`p-8` leaves about 250-310px) and on iPad. No fixed width, no
overflow risk. Tap target is `py-2.5` + `text-sm` line height, about 40px tall,
the same as the other secondary buttons in the app.

## 9. Second pass - aria-label follow-up

After the first pass the coordinator applied Finding 1. I re-checked the current
working tree from scratch:

```
$ git diff src/components/ScoreEntry.tsx | tail -16
+        <a
+          href="https://forms.gle/BicBxvKyLrqoQHj89"
+          target="_blank"
+          rel="noopener noreferrer"
+          aria-label="แจ้งปัญหา / เสนอไอเดีย (เปิดในแท็บใหม่)"
+          className="flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-muted transition-colors hover:border-border-strong hover:text-text"
+        >
+          <MessageSquareHeart className="size-4" />
+          แจ้งปัญหา / เสนอไอเดีย
+        </a>

$ npm run build
└ ○ /stats                               5.37 kB         156 kB
+ First Load JS shared by all             103 kB
○  (Static)  prerendered as static content
build exit=0

$ npx eslint src/components/ScoreEntry.tsx
lint exit=0

$ grep -rnE ": any|as any|<any>|any\[\]" src
any exit=1 (no match = pass)

$ LC_ALL=C.UTF-8 grep -rnP "[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}\x{FE0F}]" src .claude/agents CLAUDE.md
emoji exit=1 (no match = pass)
```

The accessible name is Thai and begins with the exact visible label, so voice
control users can still activate the link by speaking what they see (WCAG 2.5.3
label-in-name). The added suffix tells screen-reader users it opens a new tab.

## Findings

No findings remain.

Previously raised and now closed:

- Finding 1 (observation, new-tab link had no screen-reader hint) - fixed at
  `src/components/ScoreEntry.tsx:171` with
  `aria-label="แจ้งปัญหา / เสนอไอเดีย (เปิดในแท็บใหม่)"`.

## Verdict

A small, well-scoped change: one lucide icon import and one external link in the
post-save branch. It reuses the project's existing secondary-button token
styling, has safe `rel` attributes, a Thai label and a Thai accessible name that
announces the new tab, and adds no state and no extra abstraction. In the second
pass the build succeeded (exit 0) and lint was clean on the changed file. There
is no `any`, no emoji, no raw hex, and no data-shape or RTDB change.

PASSED
