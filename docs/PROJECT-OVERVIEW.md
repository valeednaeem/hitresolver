# HitResolver — Project Overview

**Tagline:** Make Better Decisions, Every Day!
**Supporting statement:** Turn Complex Decisions into Clear Choices.
**Positioning:** An AI-assisted decision intelligence platform.

---

## What HitResolver Is

HitResolver helps people **organize alternatives, evaluate trade-offs, compare possibilities, and make better-informed decisions**. It does not decide for them.

### Core idea

Complex decisions are usually held in someone's head as a vague feeling: *"I think Option A, but I'm not sure."* HitResolver makes that thinking **inspectable** — by forcing alternatives, criteria, weights, and risks into the open, then showing the user exactly how their own priorities produced the result.

### The three frameworks, and how they combine

| Framework | Question it answers |
|---|---|
| **Weighted Pros & Cons** | *Do the upsides outweigh the downsides, by my own weighting?* |
| **Weighted Comparison Matrix** | *Given my criteria and their importance, which option scores highest?* |
| **SWOT Analysis** | *What internal strengths/weaknesses and external opportunities/threats surround this?* |
| **Verdict Dashboard** | *What do these three signals say together — and what information am I still missing?* |

The Dashboard **never** merges the three into one number. It presents them side by side as labelled signals, plus a completeness check and rule-based next actions.

---

## Product Philosophy (binding on all future work)

1. **HitResolver does not make decisions.** It helps people make decisions they can understand, evaluate, and explain.
2. **AI supports human reasoning** — it never pretends to know the objectively correct answer.
3. **Three content types are always distinguished:**
   - **FACT** — supplied or confirmed by the user
   - **ASSUMPTION** — estimated, uncertain, or incomplete
   - **AI SUGGESTION** — generated; always editable, rejectable, acceptable
4. **Never** present an assumption or an AI suggestion as a verified fact.
5. **Never** present a calculated score as an objectively correct decision.

---

## Audiences

Individuals · Students · Professionals · Entrepreneurs · Small businesses · Business teams & organizations

---

## Current Release: Demo v0.1

A polished, reliable, responsive **local-first demo** suitable for:
product demonstrations · early user feedback · concept validation · UX evaluation · feature testing · investor/client presentations.

**Storage:** browser `localStorage` only — **not** cloud-synced, **not** cross-device, **not** backed up unless the user exports JSON.
**AI:** no provider is configured; the assistant ships clearly labelled as simulated, behind a real server-side integration boundary.
**Not included:** accounts, auth, database, payments, subscriptions, collaboration.

Full scope: `PRODUCT-REQUIREMENTS.md` · Forward plan: `FEATURE-ROADMAP.md`

---

## Documentation Map

| File | Purpose |
|---|---|
| `PROJECT-OVERVIEW.md` | This file — identity, philosophy, audiences |
| `PRODUCT-REQUIREMENTS.md` | Demo v0.1 functional scope + acceptance definition |
| `TECHNICAL-ARCHITECTURE.md` | Stack, layering, boundaries, data model |
| `DECISION-ENGINE-SPECIFICATION.md` | **Authoritative maths** for all scoring |
| `FEATURE-ROADMAP.md` | Phased delivery + future SaaS direction |
| `AI-INTEGRATION.md` | Provider status, boundary, what is simulated |
| `DATABASE-DESIGN.md` | Persistence model (localStorage + future cloud) |
| `QA-STRATEGY.md` | Testing approach and quality gates |
| `DEPLOYMENT-GUIDE.md` | Build, preview, release procedure |
| `PROJECT-STATUS.md` | **Always-current** phase, work, bugs, next action |
| `DECISIONS-LOG.md` | Significant decisions with rationale |
| `PROJECT-CHANGELOG.md` | What changed, per release |
| `PHASE0-AUDIT.md` | Repository/environment audit, prototype analysis, risks |

---

## Taglines

- **HitResolver — Make Better Decisions, Every Day!**
- **HitResolver — Think Clearly. Compare Smartly. Decide Confidently.**
