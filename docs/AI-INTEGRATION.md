# HitResolver — AI Integration

**Updated:** 2026-11-16 · **Phase:** 0 (status established) → 4 (implementation)

---

## 1. Current Status: NO PROVIDER AVAILABLE

Infrastructure was inspected before any AI design work, as required by brief §5H.

| Provider / source | Configured? | Reachable? | Used by HitResolver? |
|---|---|---|---|
| OmniRoute (`http://localhost:20128/v1`) | Yes — in OpenCode config | **No** (port closed) | **No** |
| Anthropic proxy (`http://127.0.0.1:1337`) | Yes — in env vars | **No** (port closed) | **No** |
| OpenAI | No API key present | n/a | No |
| Google / Gemini | No API key present | n/a | No |
| OpenRouter / Groq / Together / Mistral / Cohere / DeepSeek / xAI | No API keys present | n/a | No |

**Verified on:** 2026-11-16.
**Environment variable scan:** no third-party AI API keys found.

### Decision (logged as D-005)

Ship an **honest, clearly-labelled demo experience** with a **real server-side integration boundary**, so a provider can be enabled later by configuration only.

**Explicitly rejected:** reusing the agent harness's own session credentials (`ANTHROPIC_AUTH_TOKEN`, OmniRoute key). These are session-scoped, not ours to expose, would break outside this session, and would violate the brief's rule against exposing credentials in browser code.

---

## 2. What This Means for the Demo

| Aspect | Demo v0.1 behaviour |
|---|---|
| AI assistant UI | **Real** — full interaction design, inputs, suggestion cards |
| Server API boundary | **Real** — `POST /api/ai` route exists and is the only path to any model |
| Provider key handling | **Real** — server-side env var only; never in the client bundle |
| Response content | **Simulated** — generated deterministically from the user's own decision data |
| Labelling | **Conspicuous** — banner states the assistant is in demo mode |
| Overwriting user content | **Never** — suggestions are proposals; user must explicitly accept |

**The simulation is derived from the user's actual input**, not fabricated prose pretending to be a model. For example, if the user has 3 pros and 1 con, a "draft pros & cons" suggestion will be framed as a *prompt to consider* based on what they entered, and labelled as demo output.

**Never** will the app:
- display a fabricated response with wording like *"The model said…"*
- imply a real inference occurred
- hide the demo status behind a subtle footnote

---

## 3. Architecture

```
Client component  ──►  POST /api/ai  ──►  AIService (server-only)
   (never sees keys)        │                    │
                            │                    ├─► providers/openai-compatible.ts
                            │                    ├─► providers/anthropic.ts
                            │                    └─► demo.ts   ← active when no key
                            │
                            └─► validates input shape, enforces size limits,
                                strips nothing (no PII leaves the server without a provider)
```

### Interface (stable contract)

```ts
type Provenance = "model" | "demo";

interface AiSuggestion {
  id: string;
  kind: "alternatives" | "criteria" | "prosCons" | "risks" | "swot" | "gaps" | "summary" | "nextSteps";
  label: string;          // human-readable, e.g. "Suggested evaluation criteria"
  content: string[];      // list of proposed items
  provenance: Provenance; // ALWAYS present
  model?: string;         // when provenance === "model"
  accepted: boolean;      // user has explicitly merged this into their decision
}

interface AiRequest { decisionId: string; kind: AiSuggestion["kind"]; context: DecisionSnapshot }
interface AiResponse { suggestion: AiSuggestion; notice?: string }
```

### Non-negotiable rules

1. **Keys only in server env vars** (`process.env.*`), read inside `app/api/*`. Never `NEXT_PUBLIC_*`.
2. **`src/ai/server.ts` is never imported by a client component** — enforced by a lint rule.
3. **Every suggestion carries `provenance`** and renders a visible badge: `AI SUGGESTION · DEMO` or `AI SUGGESTION · <model>`.
4. **Accept is explicit.** The UI never auto-merges suggestions into user content.
5. **Editable and rejectable.** Users can edit a suggestion before accepting, or discard it.
6. **Failure is honest.** If a provider errors, the UI says so and falls back to demo mode with a clear notice — it does not silently pretend.

---

## 4. Enabling a Real Provider (future, configuration only)

When a provider and valid key are available:

1. Set the server-side env var (e.g. `AI_PROVIDER=openai-compatible`, `AI_BASE_URL=…`, `AI_API_KEY=…`).
2. Ensure `AI_BASE_URL` points at a **public HTTPS** endpoint reachable from deployment — `localhost` is not usable in production.
3. Restart; the server dispatches to the real provider.
4. UI labelling switches automatically from `DEMO` to the model name.
5. Update §1 of this file with the confirmed provider and record the decision in `DECISIONS-LOG.md`.

**No UI or engine changes required.**

---

## 5. Cost & Usage Implications

- Not yet applicable — no provider configured.
- When configured: usage is billed by the provider per token. Controls to add **before** any public release:
  - per-request size limits (truncate oversized decision snapshots)
  - request rate limiting
  - optional monthly usage cap
  - clear user-facing notice that AI features consume credits

These are **release prerequisites for v0.5**, not demo work.

---

## 6. What Is Simulated — Explicit Inventory

| Capability | Demo v0.1 | Notes |
|---|---|---|
| Understanding the decision | Partial | Reads real decision fields; no semantic understanding |
| Breaking into smaller questions | Simulated | Rule-generated from structure |
| Suggesting alternatives | Simulated | Framed as prompts, not invented options presented as facts |
| Suggesting criteria | Simulated | Derived from common frameworks, clearly labelled |
| Drafting Pros & Cons | Simulated | Anchored to the user's existing entries |
| Identifying risks | Simulated | Rule-based: flags high-impact weaknesses/threats |
| Assisting SWOT | Simulated | Structural suggestions only |
| Detecting missing information | **Real (deterministic)** | Uses the engine's completeness checks — no model needed |
| Explaining trade-offs | Simulated | Template text tied to actual calculated numbers |
| Summarising results | **Real (deterministic)** | Assembles the real calculated signals |
| Suggesting next steps | **Real (deterministic)** | The `R-*` rules from the engine spec |

> Notably, three capabilities are genuinely functional without a model because they are **deterministic calculations over the user's data**: missing-information detection, summarisation, and next-step suggestions. These come from `DECISION-ENGINE-SPECIFICATION.md` §4.3–§4.4 and are honest outputs.

---

## 7. Security Review Checklist (Phase 4 gate)

- [ ] No provider key present in any client bundle (verify with a build-output search)
- [ ] No `NEXT_PUBLIC_*` variable holds a secret
- [ ] `src/ai/server.ts` not imported client-side (lint rule passes)
- [ ] `/api/ai` validates request shape and rejects oversized payloads
- [ ] Prompt-injection surface considered: user decision text is passed as **data**, never as instructions
- [ ] Errors do not leak stack traces or env values to the client
- [ ] Rate limiting present before any public deployment
- [ ] This file's §1 status table matches reality
