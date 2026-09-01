# Code Review — Phase 5: Player Stats + Charts

**Reviewer:** code-reviewer agent  
**Ground truth:** `reference/legacy-prototype.sanitized.html`  
**Date:** 2026-09-01

---

## Build Evidence

```
npm run build   → exit 0
  ✓ Compiled successfully in 4.8s
  ✓ Linting and checking validity of types
  ✓ Generating static pages (9/9)
  Route /stats   5.35 kB  (was 796 B placeholder)

npx tsc --noEmit → exit 0, stdout empty, stderr empty

npx eslint src --max-warnings 0 → exit 0, stdout empty, stderr empty
```

## Grep Evidence

```
Database writes in stats files (src/lib/stats.ts, src/components/Stats.tsx, src/app/stats/page.tsx):
  set(            → No results.
  runTransaction  → No results.
  → Phase 5 is strictly read-only. PASS.

": any" in stats files:
  → No results. PASS.

"dummyRoom" in stats files:
  → No results. PASS.

alert( / confirm( / prompt( in stats files:
  → No results. PASS.

Emoji (visual scan):
  → None found. All icons from lucide-react (BarChart2, Loader2, TrendingUp, Trophy, TriangleAlert). PASS.
```

## Acceptance Checklist Review

### 1. Chart library choice & SSR-safety
- [x] Approved library used: **recharts** (approved by user).
- [x] Client-only import: `ResponsiveContainer`, `LineChart`, `AreaChart`, `Line`, `Area`, `XAxis`, `YAxis`, `CartesianGrid`, `ReferenceLine` all dynamically imported with `{ ssr: false }`. No SSR hydration mismatch or DOM measurement crashes.

### 2. /stats page — Server + Metadata + Client
- [x] `src/app/stats/page.tsx`: Server component exporting `metadata: { title: "สถิติ | COSMO999" }` and rendering `<Stats />`.
- [x] `Stats.tsx`: `"use client"` component using `useHistory()` + `usePlayers()` in real-time.
- [x] Player selection dropdown populated from `players` list.
- [x] Loading state (`Loader2` + Thai text, `aria-live="polite"`).
- [x] Error state (`TriangleAlert` + Thai text, `role="alert"`).
- [x] Empty state when no player is selected (instructional Thai text + icon).
- [x] Empty state when selected player has no history yet (clean Thai invitation text, no fake/zeroed charts).

### 3. Stat calculation correctness (`src/lib/stats.ts`)
- [x] **Win Rate:** `wins / (wins + losses) * 100` (net > 0 = win, net < 0 = loss, net = 0 ignored).
- [x] **Divide-by-zero guard:** When `wins + losses === 0`, `winRate` returns `0` (never `NaN`).
- [x] **Best / Worst guards:** Initialized to `±Infinity`, clamped to `0` if empty (never `±Infinity`).
- [x] **History slice:** Sorted oldest-to-newest (`Number(a.id) - Number(b.id)`), sliced to the last 10 rounds for charts (`R{startIndex + i + 1}`), prepending `"เริ่มต้น"` (0) or `"ก่อนหน้า"` (previous cumulative total) matching legacy L1306-1312.
- [x] **Animated numbers:** Stat cards utilize `<AnimatedNumber>` which automatically respects `prefers-reduced-motion`.

### 4. Charts & Design System
- [x] **Per-round score chart:** Monotone line with sign-based dot coloring (green positive, red negative, ivory neutral).
- [x] **Cumulative score chart:** Area chart with gradient fill reflecting overall standing (positive/negative).
- [x] **Theme tokens:** Colors retrieved dynamically via `getComputedStyle(document.documentElement)` CSS custom properties (`--color-success`, `--color-danger`, `--color-felt-700`, `--color-gold-400`, etc.), never hardcoded raw hex.
- [x] **Reduced motion:** `isAnimationActive={!prefersReducedMotion()}` on both chart series.
- [x] **Responsive layout:** Mobile, iPad, and desktop grid support with responsive chart container.

### 5. Code Quality
- [x] No `any` type.
- [x] No emoji (lucide-react icons used).
- [x] Thai UI / English comments.
- [x] Strictly read-only (zero database writes).

---

## Verdict

PASSED
