# HitResolver — Project Changelog

All notable changes to HitResolver, per release and per phase.
Format loosely follows Keep a Changelog.

---

## [Unreleased]

### Phase 0 — Discovery & Project Audit (2026-11-16)

**Added**
- Project repository initialized (Git, clean history from commit #1).
- Reference files copied **unmodified** into `docs/reference/`:
  - `6.01-ai_studio-app HitResolver features.txt` (915 B)
  - `ai_studio_code-hitresolver_v02.html` (51,523 B)
  - Originals at `C:\xampp\htdocs\nadeemqaisar\` left untouched.
- Documentation set:
  - `PROJECT-OVERVIEW.md`
  - `PRODUCT-REQUIREMENTS.md`
  - `TECHNICAL-ARCHITECTURE.md`
  - `DECISION-ENGINE-SPECIFICATION.md`
  - `FEATURE-ROADMAP.md`
  - `AI-INTEGRATION.md`
  - `QA-STRATEGY.md`
  - `DEPLOYMENT-GUIDE.md`
  - `PROJECT-STATUS.md`
  - `DECISIONS-LOG.md`
  - `PROJECT-CHANGELOG.md` (this file)
  - `PHASE0-AUDIT.md`

**Analysis**
- Repository audited: confirmed **greenfield** — empty directory, no pre-existing code, no git.
- Environment audited: Node v24.22.0, npm 11.17.0, Git 2.53.0, Vercel CLI 65.14.0 (authenticated), npm registry reachable.
- AI providers probed: **none reachable**; no third-party API keys in environment.
- Prototype read in full (1,514 lines); data model and all formulas extracted.
- **13 features** recorded as must-preserve.
- **25 weaknesses** catalogued (10 High severity), including:
  - display/calculation mismatch on missing matrix scores (W2)
  - score range accepts 0 despite stated 1–10 (W3)
  - unvalidated arithmetic allowing `NaN` (W1, W6)
  - unguarded `localStorage.setItem` (W7)
  - silent full-state overwrite on JSON restore (W9)
  - attribute-injection via incomplete HTML escaping (W14)
  - Markdown export omitting the Verdict Dashboard (W22)

**Decisions**
- D-001 Build greenfield; prototype is reference, not source.
- D-002 Stack: Next.js 16 + TypeScript + Tailwind + Vitest + Vercel.
- D-003 Decision engine as pure, dependency-free module.
- D-004 localStorage behind a `StorageAdapter` interface.
- D-005 No AI provider → honest labelled demo mode with real server boundary.
- D-006 Preserve-list governance for prototype features.
- D-007 Reference files copied into `docs/reference/`.
- D-008 Git initialized; clean incremental history.

**Known issues**
- None — no application code exists yet.

---

## Release History

| Version | Date | Status |
|---|---|---|
| v0.1 (demo) | — | Not yet started |
