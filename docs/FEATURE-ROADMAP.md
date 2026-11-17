# HitResolver — Feature Roadmap

**Updated:** 2026-11-16 · **Current:** Phase 0 complete

---

## Delivery Phases (SaaS trajectory)

| Phase | Name | Objective | Exit criterion |
|---|---|---|---|
| **0** | Discovery & Project Audit | Inspect repo, read references, pick stack, define scope & risks | ✅ Audit delivered |
| **1** | Product Foundation & UI/UX | Design tokens, app shell, navigation, reusable components, responsive, data model | Navigable app with coherent visual identity |
| **2** | Decision Engine | Pros & Cons, Matrix, SWOT, Verdict — as pure tested functions | **All engine tests green** |
| **3** | Persistence & Export (local) | Save, switch, JSON backup/restore, Markdown export, validation, error handling | Data survives refresh; bad import cannot corrupt data |
| **4** | Identity, User Management & Cloud Persistence | Accounts, cloud DB, ownership, sync, migration | Authenticated private workspaces; cross-user denial tested |
| **5** | AI Decision Assistant | AI experience + secure server boundary + honest fallback | Documented provider, boundary, limitations |
| **6** | QA, Security & Product Refinement | Functional, calculation, persistence, responsive, a11y, security, perf, regression | Critical & high defects fixed |
| **7** | Demo Release & Feedback | Production deployment, user testing, feedback collection | Live URL verified working |

**Sequencing rationale:** the engine (Phase 2) is built and tested *before* heavy UI polish, because calculation correctness is the project's #1 risk (`R1`). Persistence (Phase 3) follows the engine so save/load operates on a validated, tested model. Accounts & cloud persistence (Phase 4) precede AI (Phase 5) so AI operates on user-owned cloud data.

---

## Demo v0.1 — Feature Checklist

See `PRODUCT-REQUIREMENTS.md` §3 for the authoritative checkbox list (A–H).

**Must ship:** application shell · multi-decision workspace · weighted pros & cons · weighted comparison matrix · SWOT 2×2 · verdict dashboard · JSON backup/restore · Markdown export · labelled AI experience · automated engine tests · documentation.

---

## Deferred — Next Releases (not built now)

Ordered by current product value. Each becomes a logged decision when started.

### v0.2 — Trust & depth
- Sensitivity analysis: *"What if I change my priorities?"* (engine already exposes per-criterion contributions)
- Decision history / snapshots (compare a decision against an earlier version)
- richer missing-information detection
- Undo/redo
- Keyboard shortcuts & command palette

### v0.3 — Reports & sharing
- PDF report export
- Shareable read-only decision links
- Decision templates (job offer, vendor selection, build-vs-buy, study plan)
- Print-friendly layout

### v0.4 — Accounts & sync *(begin of SaaS)*
- User accounts & authentication
- Cloud-synchronized decisions
- Personal workspaces
- Cross-device continuity
- Backup & restore to account

### v0.5 — Intelligence
- **Real AI provider integration** (server-side; keys never in browser)
- AI: suggest alternatives, criteria, draft pros/cons, identify risks, assist SWOT, detect missing information, explain trade-offs, summarise
- AI suggestions strictly labelled and never overwriting user content
- Usage limits & AI credits

### v0.6 — Collaboration
- Sharing & collaboration
- Team workspaces
- Roles & permissions
- Comments / discussion on a decision

### v0.7 — Business
- Subscription management
- Free and paid plans
- Administrative dashboard
- Analytics (privacy-conscious)
- Enterprise capabilities

### Frameworks backlog (evaluated when there is demand)
Decision trees · Cost-benefit analysis · Formal risk analysis · AHP (Analytic Hierarchy Process) · Weighted scoring variants

---

## Deliberately Excluded — Long Term

Nothing here is forbidden forever; these are simply **not** part of a decision-support product's near-term value:

- Automated decision-making without human input (contradicts product philosophy)
- Presenting AI output as verified fact (forbidden by philosophy)
- Any composite "scientific overall score" across unrelated frameworks (forbidden by brief §5F)

---

## Roadmap Maintenance Rule

This file is updated whenever:
- a phase completes,
- scope is added or cut,
- a deferred item is promoted to active development,
- a future item is rejected (with reason logged in `DECISIONS-LOG.md`).
