# HitResolver

**Make Better Decisions, Every Day!**

HitResolver is an AI-assisted decision-intelligence product demo: organise alternatives, weigh trade-offs across four frameworks, and reach a clearly-explained decision.

> **Demo build.** Data is stored in this browser's local storage only — not synced, not backed up. There are no accounts and no cloud storage in this release.

## Frameworks

1. **Weighted Pros & Cons** — impact-weighted balance with a labelled verdict
2. **Weighted Comparison Matrix** — score options against weighted criteria
3. **SWOT Analysis** — 2×2 internal/external mapping with impact tags
4. **HitResolver Verdict** — combined overview that separates calculation from interpretation

## Stack

Next.js 16 · TypeScript · Tailwind CSS 4 · Vitest · Vercel (free tier)

## Development

```bash
npm install
npm run dev        # http://localhost:3000
```

## Quality checks

```bash
npm run check      # typecheck + lint + tests
npm test           # vitest run
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # production build
```

## Architecture

| Layer | Location | Rule |
|---|---|---|
| Domain | `src/domain/` | Types, validation, factories — no framework imports |
| Engine | `src/engine/` (Phase 2) | Pure TypeScript, zero dependencies |
| Storage | `src/storage/` | Behind `StorageAdapter`; localStorage first |
| State | `src/state/` | Reducer + debounced persistence |
| UI | `src/components/` | Presentational; never calculates scores |

AI (Phase 4) sits behind a server-side boundary. AI suggestions are always kept separate from deterministic calculations and never silently modify user-defined weights, scores or rankings.

## Documentation

Project documentation lives in [`docs/`](docs/) — start with `docs/PROJECT-STATUS.md`.
