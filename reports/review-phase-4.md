# Code Review — Phase 4: Regular Groups / ขาประจำ

**Reviewer:** code-reviewer agent  
**Ground truth:** `reference/legacy-prototype.sanitized.html`  
**Date:** 2026-09-01

---

## Build Evidence

```
npm run build   → exit 0
  ✓ Compiled successfully in 5.3s
  ✓ Linting and checking validity of types
  ✓ Generating static pages (9/9)
  Route /groups  4.9 kB  (new, was 798 B placeholder)
  Route /        8.74 kB (was 8.5 kB; +Suspense boundary in RoundSetup)

npx tsc --noEmit → exit 0, stdout empty, stderr empty

npx eslint src --max-warnings 0 → exit 0, stdout empty, stderr empty
```

## Grep Evidence

```
"dummyRoom" in new files (groups.ts, Groups.tsx, GroupScoreDialog.tsx,
  EditGroupDialog.tsx, RoundSetup.tsx, groups/page.tsx):
  → No hits. All writes use DB_PATHS.groups / DB_PATHS.root. PASS.

": any" in src/: No results. PASS.

alert( in src/:
  History.tsx:8    // comment only
  ConfirmDialog.tsx:6  // comment only
  → No actual calls. PASS.

prompt( in src/:
  Groups.tsx:5     // comment "Replaced prompt()/confirm() with dialogs"
  EditGroupDialog.tsx:5  // comment "which used prompt()/confirm() - replaced"
  ConfirmDialog.tsx:6    // comment only
  → Comments only. PASS.

confirm( in src/:
  rounds.ts:143, History.tsx:8, ConfirmDialog.tsx:5, Groups.tsx:5,
  EditGroupDialog.tsx:5  → all comments. PASS.

Emoji (visual scan of all new files): none. PASS.
```

## Acceptance Checklist Review

### /groups page — server + metadata + client

- [x] `src/app/groups/page.tsx`: server component, `metadata: { title: "ขาประจำ | COSMO999" }`, renders `<Groups />`
- [x] `Groups.tsx` is `"use client"`, uses `useGroups()` (real-time) + `usePlayers()` (real-time)
- [x] Loading state: Loader2 spinner + Thai text (`aria-live="polite"`)
- [x] Error state: TriangleAlert icon + Thai text (`role="alert"`)
- [x] Empty state: ClipboardList icon + Thai invitation ("บันทึกรอบแรกจากหน้าหลัก")

### Group cards

- [x] Group name displayed in `<h2>`
- [x] Member names: `group.playerIds.map(id => player?.name ?? "(ถูกลบ)")` — deleted players shown as `(ถูกลบ)`. Matches legacy L1461-1464.
- [x] 3 action buttons per card: "เล่นกลุ่มนี้", "ดูคะแนน", "แก้ไข"
- [x] Grid layout: `sm:grid-cols-2` — responsive on mobile + iPad + desktop

### เล่นกลุ่มนี้ (port playThisGroup L682)

- [x] Filters `group.playerIds` to only ids existing in current `players` array — matches legacy `group.playerIds.filter(id => players.some(p => p.id === id))`
- [x] Guard: `validIds.length < 2` → returns Thai error string → displayed inline (no `alert()`). Matches legacy guard L686.
- [x] Success: `router.push("/?preset=" + validIds.join(","))` — preset URL param hand-off
- [x] No `alert()` used

### Preset selection in RoundSetup

- [x] `RoundSetupInner` reads `searchParams.get("preset")` on mount, splits by ",", filters to valid player ids
- [x] Calls `router.replace("/")` immediately after to clean URL — no history entry added, back button goes to `/groups` not `/?preset=...`
- [x] `eslint-disable-next-line react-hooks/exhaustive-deps` comment explains the intentional empty dependency array (run once on mount only)
- [x] Exported `RoundSetup` wraps inner component in `<Suspense>` with a shell fallback (no layout shift, no collapse)
- [x] All existing RoundSetup behaviour unchanged (toggle, multiplier, proceed, reset)

### ดูคะแนนรายกลุ่ม (port showGroupScore L1484)

- [x] `GroupScoreDialog.tsx`: native `<dialog>` + `showModal()`, same pattern as PreviewDialog
- [x] Sorts by `group.scores[id] ?? 0` descending — matches legacy L1498-1506
- [x] Rank badge colours: rank-1 `text-accent` (gold), rank-2 `text-rank-silver`, rank-3 `text-rank-bronze` — semantic tokens, no hardcoded hex
- [x] Deleted player: `players.find(p => p.id === pId) ?? null` → shows `(ถูกลบ)` — matches legacy L1502
- [x] Read-only: no Firebase writes

### แก้ไขกลุ่ม (port editGroup L1530)

- [x] `EditGroupDialog.tsx`: native `<dialog>`, no `prompt()` / `confirm()`
- [x] Rename section: `<input>` prefilled with `group.name`, save button disabled when name unchanged or empty
- [x] Delete section: destructive button with explanation "ประวัติการเล่นเดิมยังคงอยู่" — matches legacy L1538 "ข้อมูลประวัติการเล่นของกลุ่มนี้จะยังคงอยู่"
- [x] `activeAction` state tracks which button triggered busy, shows spinner on the correct button
- [x] `busy` disables all controls including close button

### groups.ts write lib

- [x] `renameGroup`: `readList<Group>(DB_PATHS.groups)` → map → `set(ref(database, DB_PATHS.groups), next)` — groups written back as **array**
- [x] `deleteGroup`: `readList<Group>(DB_PATHS.groups)` → filter → `set(...)` as **array**
- [x] Pattern identical to `players.ts` (read-modify-write-array)
- [x] No transaction needed (groups-only write, no cross-collection consistency required)
- [x] History entries untouched — matches legacy L1539 (only `groups.filter(g => g.id !== groupId)` then `saveGroupsData()`)
- [x] Throws on failure → caller shows inline Thai error in `EditGroupDialog`
- [x] `DB_PATHS.groups` used throughout — no literal `"dummyRoom"`

### Code quality

- [x] No `any` in any new file
- [x] No emoji — Users, Play, Pencil, BarChart2, Trash2, Loader2, TriangleAlert, ClipboardList, X all from lucide-react
- [x] All UI text in Thai, all comments in English
- [x] No hardcoded hex — all colours via semantic tokens (`text-accent`, `text-rank-silver`, `text-rank-bronze`, `text-success`, `text-danger`, `bg-danger`, `bg-surface-raised`, etc.)
- [x] No new dependencies
- [x] `reveal` class on `<article>` in GroupCard for entrance animation (respects `prefers-reduced-motion` via global CSS)
- [x] Responsive: `sm:grid-cols-2` for card grid, `w-[min(26rem,...)]` for dialogs

### Special reviewer checks

| Item | Result |
|---|---|
| groups written back as ARRAY | PASS — `set(ref(database, DB_PATHS.groups), groups)` where `groups: Group[]` |
| No literal `"dummyRoom"` in new code | PASS |
| Preset selection: no global state management | PASS — URL param only, no Context/Zustand |
| Guard: < 2 valid members → inline error, no navigate | PASS — `handlePlay` returns error string, `GroupCard` renders it |
| No `prompt()` / `confirm()` | PASS — comments only |
| History preserved on group delete | PASS — `deleteGroup` only filters `groups` array, history is untouched |
| Suspense boundary for useSearchParams | PASS — `RoundSetup` export wraps `RoundSetupInner` in `<Suspense>` |
| URL cleaned after preset applied | PASS — `router.replace("/")` on mount |

---

## Verdict

PASSED
