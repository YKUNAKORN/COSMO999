# Review - Phase 9 (whole-project bug hunt)

Scope: verify two uncommitted bug fixes in `src/components/RoundSetup.tsx`
(preset URL race + presetTrigger re-apply), confirm no regressions to the
preset flows, and sanity-check core logic (scoring / rounds / stats).

BASE_SHA reviewed against: b45b120 (HEAD). Changes are uncommitted in the
working tree.

## Commands run

### npm run build (tail)

    ./src/components/RoundSetup.tsx
    242:13  Warning: Using `<img>` ... (no-img-element)
    ...
    Route (app)                                 Size  First Load JS
    +/                                       10.8 kB         163 kB
    +/groups                                 4.91 kB         155 kB
    +/history                                3.24 kB         156 kB
    +/leaderboard                            4.65 kB         155 kB
    +/stats                                  5.37 kB         156 kB
     Compiled successfully in 4.1s
     Generating static pages (9/9)

Build finished with NO errors. Only pre-existing `no-img-element` warnings
(LatestRoundCard, Leaderboard, RoundSetup) - none introduced by this change.

### grep -rnE ": any|as any|<any>|any\[\]" src

    (no output; exit 1) -> PASS

### emoji scan (LC_ALL=C.UTF-8 grep -rnP ... src .claude/agents CLAUDE.md reports)

    reports/review-phase-3b.md, -4, -5, -6, -7: checkmark glyphs (U+2713 / U+2705)

No emoji in `src`, `.claude/agents`, or `CLAUDE.md`. The only hits are
checkmark glyphs inside PRIOR review reports (phases 3b-7), which are
historical artefacts of earlier reviewer runs and outside the scope of this
task (only RoundSetup.tsx changed). Non-blocking for this phase; see Finding 3.

## Ground-truth cross-check

- Scoring formula unchanged and faithful: prototype L751-755 `sumDifference`
  / `fScore = sumDifference * multi` matches `src/lib/scoring.ts` L32-38.
- Array writes preserved: prototype L575 `playersRef.set(players)` writes a
  whole array; `normalizeList` + `applyRound`/`undoRound`/`recalculateScores`
  in `src/lib/rounds.ts` return `players`/`groups` as arrays and keep
  `history` as a keyed object (L104-108, L201-204, L270). No keyed-object
  regression.
- Model fields match: prototype L610 new player `{ id, name, image:'',
  totalScore:0, latestScore:null }` matches `src/types/models.ts` L4-13.
- totalScore/latestScore accumulation (prototype L919-920, L1066, L1098-1106)
  matches rounds.ts L61-68, L179-183, L231-235, L247-253.
- RTDB paths resolve to `dummyRoom/{players,groups,history}` when
  `NEXT_PUBLIC_RTDB_ROOT` is unset/empty (firebase.ts L30-39, `||` fallback).

## Findings

1. Bug 1 fix (RoundSetup.tsx L90-106) - CORRECT. The mount effect no longer
   filters `requestedIds` against `players` (which is empty on the first
   client-side mount from /groups, causing every id to be dropped and the
   preset lost when `router.replace("/")` cleaned the URL). It now sets
   `selectedIds` to the raw requested ids. Validity is enforced reactively by
   `validSelectedIds` (L167-169), which is what feeds the picker (L222), the
   count/guard (L170, L253), and `handleProceed` (L176). A since-deleted
   player therefore still cannot be counted or scored, so the original delete
   guard is preserved. No regression. No fix required.

2. Bug 2 fix (RoundSetup.tsx L108-132) - CORRECT. `appliedTriggerRef` (a
   timestamp ref) stops the trigger effect from re-applying on every live
   `players` snapshot, which previously overwrote the user's manual selection
   and forced `setStep("setup")` mid score-entry. Because `appliedTriggerRef`
   is only set when `validIds.length > 0`, a trigger that fires before players
   load is retried on the next `players` update (deferred apply intact). Each
   new tap produces a fresh `Date.now()` timestamp, so genuine re-triggers
   still apply. The URL-preset flow (Finding 1) is unaffected since
   `presetTrigger` is null on that path. No fix required.

3. Pre-existing emoji glyphs in reports/review-phase-3b|4|5|6|7.md
   (checkmarks). Outside this task's change scope (this task touched only
   RoundSetup.tsx) and inherited from earlier reviewer output. Recommend a
   follow-up cleanup pass to strip them, but not a blocker for handing off the
   two RoundSetup fixes under review here.

## Verdict

The two fixes are sound, faithful to the ground truth, and introduce no
regressions or rule violations. Build passes, no `any`, no emoji in source.

PASSED
