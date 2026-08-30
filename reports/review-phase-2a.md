# Code review - phase 2a

Scope: dev-path guard (Part B) and player CRUD (Part C), plus the Part A
review-system files in the same diff.

Two rounds. Round 1 raised five findings; all five were fixed and re-verified
in round 2 below.

Build: `npm run build` run by the reviewer in both rounds. Exit 0, no type or
lint errors. Route `/` prerendered as static content.

## Round 1 findings and their verification

1. `src/lib/firebase.ts:30` - FIXED. `const RTDB_ROOT =
   process.env.NEXT_PUBLIC_RTDB_ROOT || "dummyRoom";`. A defined-but-empty env
   var now falls back to the production root instead of resolving every path
   at the database root. The comment on lines 28-29 records why `||` is used
   rather than `??`, so the choice will not be "corrected" back later.
2. `src/components/PlayerList.tsx:184-192` - FIXED. The edit-mode file input
   has an `onChange` storing `event.target.files?.[0]?.name ?? null`, and the
   button label at line 182 renders `{fileName ?? "เปลี่ยนรูป"}`. The row now
   confirms a picked photo the same way `CreatePlayerForm` does.
3. `src/components/PlayerList.tsx:41-49` - FIXED. `enterEdit()` seeds `name`
   from `player.name` at the moment editing starts, and also clears
   `fileName`, `error`, and the file input. The pencil button (line 129) calls
   it. A remote rename is no longer reverted by a later local save.
4. `src/components/PlayerList.tsx:107` - FIXED. The edit input carries
   `aria-label="ชื่อผู้เล่น"`, matching the labelled icon buttons around it.
5. `src/components/CreatePlayerForm.tsx:54-57` and
   `src/components/PlayerList.tsx:108-111` - FIXED. Both name change handlers
   clear `error`, so the validation message disappears as soon as the user
   types.

## Full checks, round 2

- No `any` in `src/`. The only match for the word is prose inside a comment in
  `src/types/models.ts`. The Firebase boundary is narrowed once in
  `normalizeList` (`src/lib/rtdb.ts`) via `unknown` plus an explicit
  `Record<string, T | null | undefined>` cast and a type-guard filter.
- `dummyRoom/players` is still written as a plain array. `writeAll` in
  `src/lib/players.ts` does `set(ref(database, DB_PATHS.players), players)`
  with an array, matching legacy `saveData() { playersRef.set(players); }`.
- Models match `src/types/models.ts` and `reference/legacy-prototype.html`.
  `createPlayer` produces `id: Date.now().toString()`, `totalScore: 0`,
  `latestScore: null`, `image: ""` when none is given - identical to legacy
  `addPlayer`. `updatePlayer` touches only name and image, never the score
  fields, like legacy `savePlayerEdit`. `deletePlayer` filters by id and
  re-sets the array, like legacy `deletePlayer`.
- `fileToResizedDataUrl` matches legacy `getBase64Image`: 150px max edge,
  aspect ratio preserved, `image/jpeg` at quality 0.6.
- RTDB path root defaults to `dummyRoom`, so production paths are unchanged
  when `NEXT_PUBLIC_RTDB_ROOT` is unset, empty, or absent. The three child
  names stay `players` / `groups` / `history`.
- Listener cleanup is correct. `usePlayers` returns the `subscribeToList`
  unsubscribe from its effect; `readList` is a one-shot `get` and attaches
  nothing that needs detaching.
- No emoji anywhere in `src/`, `CLAUDE.md`, `.env.example`, or the agent file.
  UI copy is Thai, comments are English, icons all come from `lucide-react`.
- Only semantic theme tokens are used (`bg`, `surface`, `surface-raised`,
  `border`, `border-strong`, `accent`, `on-accent`, `danger`, `danger-strong`,
  `on-danger`, `text-muted`, `suit-red`, `shadow-card`). No raw hex.
- Responsive. `max-w-2xl` with `px-4 sm:px-6`, `min-w-0` plus `truncate` on
  the name, `shrink-0` on the avatar and the action buttons, `text-base`
  inputs so iOS does not zoom on focus. No fixed pixel widths, no horizontal
  overflow at phone width or on iPad.
- No over-engineering. `readList` is used by all three write helpers, the
  components carry no speculative props, and the dev-root override is one env
  lookup with a default.

## Notes, no change required

- Read-modify-write races. `createPlayer` / `updatePlayer` / `deletePlayer`
  each read the whole array and set it back, so two devices mutating the
  roster in the same instant can lose one edit. This is exactly the legacy
  behaviour, so it is scope-parity for this phase. Worth revisiting with
  `runTransaction` when round scoring lands in 2b, where concurrent writes are
  the normal case rather than the exception.
- `latestScore: null` is stripped by Firebase on write, so a freshly created
  player reads back with `latestScore` absent (`undefined`), not `null`. Same
  as legacy and the type stays correct for the stored legacy data, but phase
  2b must test with `== null` rather than `=== null`.
- `enterEdit` and `resetToView` overlap by a few lines. Both are short and
  mean different things (start editing vs. abandon editing), so leaving them
  separate is the more readable option.
- `reference/legacy-prototype.html` contains emoji. It is a verbatim archive
  of the legacy app kept for reference, not project UI or comments, so the
  no-emoji rule is not violated by keeping it byte-identical. The duplicate
  untracked `cosmo999-prototype.html` at the repo root is now redundant and
  could be deleted.

PASSED
