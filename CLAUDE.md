# COSMO999 - project rules

Dashboard for tallying Thai Rummy (dummy) card scores among friends. For fun only.

Stack: Next.js 15 (App Router) + TypeScript + TailwindCSS v4 + Firebase Realtime
Database + lucide-react. Deploys on Vercel.

## Language

- All user-facing content on the site is written in Thai.
- All code comments are written in English only.

## Hard rules

- No emoji anywhere - not in the UI, not in comments, not in commit messages.
  When an icon is needed, use `lucide-react`.
- Never use the TypeScript type `any`. If a type is genuinely unknown, use
  `unknown` and narrow it.
- Keep the code clean and maintainable. Do not over-engineer: no speculative
  abstraction, no config for cases that do not exist yet.
- Responsive design targets mobile phones and iPad first.

## Firebase data

- Use the existing Firebase project `dummy-ae198` and the existing RTDB paths.
  Do not change them, or old data is lost:
  - `dummyRoom/players`
  - `dummyRoom/groups`
  - `dummyRoom/history`
- TypeScript models must match the legacy structure exactly, field names AND
  types (`src/types/models.ts` is the source of truth):
  - `Player`: `id: string`, `name: string`, `image: string`,
    `totalScore: number`, `latestScore: number | null` (null = never scored yet)
  - `Group`: `id: string`, `name: string`, `playerIds: string[]`,
    `scores: Record<string, number>` (keyed by player id)
  - `History` (`HistoryEntry`): `id: string`,
    `timestamp: string` (ISO 8601 from `new Date().toISOString()`, not epoch),
    `groupName: string`, `groupId: string`, `multiplier: number`,
    `playerScores: Record<string, number>` (keyed by player id),
    `commentary: string`
- Firebase config is read from `NEXT_PUBLIC_FIREBASE_*` env vars. Real values
  live in `.env.local` (git-ignored); `.env.example` holds placeholders.

## Theme

- Casino / Las Vegas table look: dark felt green base, gold, and crimson.
- Primary font is `Prompt` (Thai + Latin), loaded via `next/font`.
- Colors and other design values are defined once as tokens in
  `src/app/globals.css` (`@theme`). Consume the semantic tokens
  (`bg`, `surface`, `accent`, `danger`, ...). Never hardcode a repeated hex.

## Workflow

- After writing or changing any code, run the build and verify it works:
  `npm run build`, then check `npm run dev`.
- At the end of every task, invoke the `code-reviewer` agent. If it reports
  NOT PASSED, fix the issues and re-review until it passes before handing off.
- Caveman mode is for task explanations only. Never apply it to code, config,
  comments, commit messages, or docs.
