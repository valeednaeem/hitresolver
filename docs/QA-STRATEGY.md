# HitResolver — QA Strategy

**Updated:** 2026-11-17 · **Phase:** 0 (established) → 3 (exit gate executed) → 5 (executed)

---

## 1. Quality Principle

> A feature is complete only when: behaviour implemented · validation works · error cases handled · relevant tests pass · works with the surrounding app · no known critical regression · documentation updated.

" The code exists" is never a completion signal. Every phase has an explicit exit gate.

---

## 2. Test Pyramid for This Project

| Layer | Tool | Scope | Target |
|---|---|---|---|
| **Unit — engine** | Vitest | Every formula in `DECISION-ENGINE-SPECIFICATION.md` | Highest priority; run on every change |
| **Unit — domain** | Vitest | Validation, schema, ID generation | Full rejection-path coverage |
| **Unit — storage** | Vitest | Adapter round-trip, quota failure, corrupt data | Simulated failures |
| **Component** | Vitest + Testing Library | Key interactions, empty/error states | Per feature module |
| **Integration** | Testing Library | Full workflows (create → score → export → restore) | Critical paths |
| **Manual — responsive** | Browser devtools | 4 breakpoints × critical flows | Phase 5 |
| **Manual — accessibility** | Keyboard + screen reader spot-check | Nav, forms, tabs, modals | Phase 5 |
| **Security review** | Manual + lint rules | Injection, secrets, unsafe rendering | Phases 4 & 5 |

---

## 3. The Engine Test Gate (Phase 2 exit criterion)

The decision engine is HitResolver's signature feature and the project's #1 risk (R1). Its gate is absolute:

**Required before any Phase 2 work is considered complete:**

- [ ] Every formula in spec §1–§4 implemented as a pure function
- [ ] **All 25 edge cases (E1–E25)** in spec §5 covered by named tests
- [ ] Every prototype defect **W1–W6** and **W22–W23** has a regression test
- [ ] Property checks: `0 <= pct <= 100` for any valid input; ranking is a total order
- [ ] Engine tests import **zero** React/DOM modules (verified by test config)
- [ ] `npm test` green
- [ ] Spec and implementation agree (spec is authoritative; mismatch = bug)

**No UI work may be layered over a red engine suite.**

---

## 4. Phase 3 — Persistence & Export Exit Gate (2026-11-17)

**Required before Phase 3 work is considered complete:**

- [x] Backup module (`src/storage/backup.ts`) funnels every import through `validateAppState` (validate-before-accept)
- [x] Corrupt JSON / unsupported schema version / empty decisions / dangling `activeDecisionId` / duplicate ids / unknown references / out-of-range weights rejected with concrete errors
- [x] Restore requires explicit user confirmation (modal) before replacing existing decisions; invalid files never open the confirm modal
- [x] Markdown export includes decision details, Pros & Cons, Matrix, SWOT, Verdict Dashboard, risks/recommendations and incomplete warnings, reflecting the actual state
- [x] Persistence stayed behind `StorageAdapter`; no DB/auth/subscriptions/cloud; no new dependencies; AI architecture untouched
- [x] `npm test` green (engine, domain, storage, component — **215 tests**), `npm run lint` / `npm run typecheck` / `npm run build` green, `npm audit` 0 vulnerabilities

---

## 5. Per-Defect Regression Coverage

Each catalogued prototype weakness maps to at least one test. Named so the link is obvious:

| Prototype defect | Test must prove |
|---|---|
| W1 NaN propagation | Invalid weight rejected; totals never `NaN` |
| W2 display/calc mismatch | Missing cell reported as missing, not shown as 5 |
| W3 score range 0–10 | 0 rejected; range is 1–10 |
| W4 no tie handling | Equal scores → same rank, "Tied" surfaced |
| W5 all weights zero | Explicit "No valid criterion weights" state |
| W6 unvalidated weights | Negative, zero, non-numeric all rejected |
| W7 unguarded save | Quota failure surfaces visibly, data not lost |
| W8 silent fallback | Corrupt data reported, **not** replaced by sample |
| W9 silent overwrite | Restore requires explicit user confirmation |
| W10 unvalidated import | Malformed nested shape rejected with clear message |
| W11 delete w/o confirm | Confirmation required |
| W12 dangling active ID | Falls back safely to a valid decision |
| W14 attribute injection | `"` and `'` in user text render inert |
| W22 export gap | Markdown export includes the Verdict Dashboard |
| W23 no gap detection | Completeness checks produce concrete messages |

---

## 6. Manual Test Script — Critical Flows (Phase 5)

Run end-to-end on desktop **and** mobile viewport before release.

1. **First run** — app loads with example decision; no console errors; no blank screen
2. **Create** — new decision appears, becomes active, persists after refresh
3. **Rename / describe** — edits persist; sidebar reflects title
4. **Duplicate** — copy is independent; editing the copy does not change the original
5. **Delete** — confirmation shown; cannot delete the last decision
6. **Pros & Cons** — add/edit/remove; weights enforced; balance + verdict update live
7. **Matrix** — add options/criteria; weights enforced; scores 1–10 enforced; notes save; totals, %, ranking, leader, breakdown correct
8. **Matrix edge** — delete an option; scores/notes cleaned up; no orphan references
9. **SWOT** — add/edit/remove in all four quadrants; impact levels; internal/external labels
10. **Verdict** — all four signal badges correct; completeness reflects actual state; each recommendation traceable to a rule
11. **Export Markdown** — file downloads; includes verdict section; opens cleanly
12. **Backup JSON** — downloads valid JSON
13. **Restore JSON** — valid file: explicit choice required before anything is replaced; invalid file: clear error, **existing data untouched**
14. **Quota simulation** — storage failure shows a clear message, no data loss
15. **Refresh mid-edit** — no lost work

---

## 7. Responsive Checks

| Viewport | Must verify |
|---|---|
| 1440×900 (desktop) | Sidebar + workspace; full matrix visible |
| 1024×768 (small laptop) | No overlap; matrix scrollable |
| 768×1024 (tablet) | Sidebar drawer works; SWOT 2×2 → stacked appropriately |
| 390×844 (mobile) | Drawer nav reachable; workspace not pushed below fold; controls full-width; matrix scrolls horizontally with sticky header |

---

## 8. Accessibility Checks

- [ ] Full keyboard navigation: tabs, sidebar, forms, modals, delete confirmations
- [ ] Visible focus rings on all interactive elements
- [ ] All icon-only buttons have accessible names (`aria-label`)
- [ ] Tabs implemented as ARIA tabs with correct `aria-selected`
- [ ] Toast uses `aria-live="polite"`
- [ ] Colour is never the **only** signal (impact levels carry text; verdicts carry labels)
- [ ] Form errors associated with inputs (`aria-describedby`)
- [ ] Body text contrast ≥ 4.5:1; large text ≥ 3:1
- [ ] Touch targets ≥ 44×44 px on mobile

---

## 9. Security Checks

- [ ] No `innerHTML` / `dangerouslySetInnerHTML` with user data (lint-enforced)
- [ ] No secrets in the client bundle (build-output search)
- [ ] No `NEXT_PUBLIC_*` secrets
- [ ] Malicious strings (`<img onerror>`, `"><script>`, `javascript:` URLs) render inert
- [ ] Imported JSON cannot execute anything (data only, never evaluated)
- [ ] API route validates input and rejects oversized payloads
- [ ] No sensitive values in logs
- [ ] `.env` files git-ignored (verified in `.gitignore`)

---

## 10. Performance Checks

- [ ] No full-state serialisation on every keystroke (debounced autosave)
- [ ] First load renders without layout shift
- [ ] Matrix with 10 options × 10 criteria stays responsive while typing
- [ ] No unnecessary re-renders on score input (targeted state updates)
- [ ] No external network dependency required for core operation

---

## 11. Exit Gate — Phase 5

Release is blocked until **all** hold:

- [ ] `npm test` green (engine, domain, storage, component)
- [ ] `npm run lint` green
- [ ] `npm run build` green
- [ ] All critical flows in §5 pass on desktop **and** mobile
- [ ] §7 accessibility checks pass
- [ ] §8 security checks pass
- [ ] No open **Critical** or **High** defects
- [ ] Every Medium defect either fixed or logged in `PROJECT-STATUS.md` with rationale
- [ ] Documentation matches implementation

**No release is declared from a successful local build alone.**
