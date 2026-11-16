# HitResolver — Deployment Guide

**Updated:** 2026-11-16 · **Phase:** 0 (established) → 6 (executed)

---

## 1. Release Ladder

Order is mandatory. Never skip a rung.

```
1. Local development        npm run dev
2. Verified local build     npm run build && npm start
3. Preview deployment       vercel (preview)     ← first external URL
4. Staging verification     manual script (QA-STRATEGY §5) against the preview URL
5. Production deployment    only after explicit owner authorization
```

**Current status:** none of these have been run — no application code exists yet.

---

## 2. Target Platform

| Item | Value |
|---|---|
| Platform | **Vercel** |
| CLI | v65.14.0, **already authenticated** as `valeednaeem` |
| Cost | Free tier — sufficient for the demo |
| New credentials required | **None** |
| Framework preset | Next.js (auto-detected) |

**Why Vercel:** the CLI is authenticated today, preview deployments are free, and it is the native host for the chosen Next.js stack — no container, no server management, no recurring cost.

**Alternatives considered:** Netlify (CLI not installed), Cloudflare Pages (`wrangler` not installed), XAMPP/PHP (irrelevant to this stack), a VPS (paid, unjustified at this stage — brief forbids paid infra without justification).

---

## 3. Pre-Deployment Checklist (every time)

- [ ] All changes committed; working tree clean
- [ ] `npm test` green
- [ ] `npm run lint` green
- [ ] `npm run build` green
- [ ] No secrets in the tree: `.env*` git-ignored, no keys in source
- [ ] Build output searched for leaked credentials
- [ ] Environment variables reviewed — only intended values present
- [ ] `PROJECT-STATUS.md` updated
- [ ] Rollback identified: previous deploy is restorable from the Vercel dashboard

---

## 4. Environment Variables

| Name | Where set | Client-visible? | Notes |
|---|---|---|---|
| `AI_PROVIDER` | Vercel project settings | **No** | Absent ⇒ demo mode |
| `AI_BASE_URL` | Vercel project settings | **No** | Must be public HTTPS in deployment |
| `AI_API_KEY` | Vercel project settings | **No** | **Never** `NEXT_PUBLIC_*` |

Rules:
- Never commit `.env` files (git-ignored).
- Never prefix a secret with `NEXT_PUBLIC_` — Next.js inlines those into the browser bundle.
- Demo v0.1 ships with **no AI variables set**, which is the correct and honest default.

---

## 5. Local Development

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine + domain + storage suites
npm run lint
npm run build      # must pass before any deploy
```

---

## 6. Preview Deployment (Phase 6 target)

```bash
vercel            # first run may prompt to link the project
```

**Verification before reporting any URL:**

1. Deploy command exits successfully
2. URL opens in a browser
3. First-run example decision renders
4. All critical flows pass (`QA-STRATEGY.md` §5)
5. Mobile viewport presentation checked
6. No console errors
7. No leaked environment values visible in the bundle

> **Rule (brief §12):** never claim deployment succeeded based on a local build alone. The deployed application itself must be verified.

---

## 7. Rollback

- Every deploy is retained by the platform.
- To roll back: promote the previous deployment from the Vercel dashboard (instant, no rebuild).
- Verify the rolled-back URL before announcing it.

---

## 8. Production Release — REQUIRES OWNER AUTHORIZATION

Per the brief, the agent **prepares** but does **not execute** a public production release without explicit approval. Production additionally requires:

- [ ] Real AI provider configured (if AI is to be non-demo), with rate limits and a usage cap
- [ ] Security review complete (`QA-STRATEGY.md` §8)
- [ ] Accessibility review complete (§7)
- [ ] Terms/privacy placeholders considered if real users are invited
- [ ] Owner's explicit written authorization

---

## 9. Deployment Record

| Date | Version | Environment | URL | Commit | Verified | Notes |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | No deployments yet |

*Append a row for every deploy.*
