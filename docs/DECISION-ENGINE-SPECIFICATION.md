# Decision Engine Specification — HitResolver

**Status:** Authoritative · **Version:** 1.0 · **Updated:** 2026-11-16
**Owner of this doc:** Technical Architect · **Reviewed by:** QA Lead (Phase 2 gate)

> This is HitResolver's signature feature. The maths must be unambiguous, deterministic, and defensible.
> Every rule here is implemented in `src/engine/` as pure functions and covered by unit tests.
> **No UI code may re-implement any formula in this document.**

---

## 0. Global Principles

1. **Determinism** — same input ⇒ byte-identical output. No randomness, no dates, no locale dependence.
2. **No silent coercion** — invalid input never becomes a plausible-looking number. It is rejected or explicitly excluded, and surfaced to the user.
3. **No hidden weighting** — every number shown is explainable by a formula in this document.
4. **No false authority** — outputs are *results of the user's inputs*, never objective truths.
5. **Total order with explicit ties** — ranking always resolves deterministically, and ties are reported as ties.

### 0.1 Numeric policy

| Rule | Value |
|---|---|
| Score range (matrix cell) | integer **1–10** inclusive |
| Criterion weight range | integer **1–10** inclusive |
| Pros/Cons weight range | integer **1–10** inclusive (UI presets 3, 5, 8, 10) |
| SWOT impact levels | `High` \| `Medium` \| `Low` |
| Non-finite values | `NaN`, `±Infinity` ⇒ **rejected** |
| Negative / zero weights | **rejected** for criteria and pros/cons |
| Zero score | **rejected** in matrix (range starts at 1) |
| Fractional input | rounded half-away-from-zero, then range-checked |
| Rounding for display | half-up to integer percentage; raw scores kept at full precision for ranking |

> **Why reject rather than clamp:** the prototype clamped silently (audit W3, W6). A user who types `15` for a weight believes they set 15. Silently turning it into 10 produces a number the user cannot explain. We reject, keep the field in an error state, and show the allowed range.

---

## 1. Weighted Pros & Cons

### 1.1 Inputs

```
pros = [{ id, text, weight }]
cons = [{ id, text, weight }]
```

### 1.2 Formulas

```
prosPts = Σ weight(p)   for p in pros
consPts = Σ weight(c)   for c in cons
total   = prosPts + consPts

pct = (total == 0) ? 50 : round_half_up(prosPts / total × 100)
```

`pct` is the **positive weight share**, not a probability and not a confidence score.

### 1.3 Verdict bands

Applied to `pct` in this exact order (first match wins):

| Condition | Label |
|---|---|
| `pct >= 65` | **Strong Go** |
| `pct >= 55` | **Lean Yes** |
| `pct <= 35` | **Strong No** |
| `pct <= 45` | **Lean No** |
| otherwise (46–54, or `total == 0`) | **Balanced** |

Boundary behaviour (tested explicitly):

| prosPts / total | pct | Label |
|---|---|---|
| 0 / 0 | 50 | Balanced |
| 65 / 100 | 65 | Strong Go |
| 64 / 100 | 64 | Lean Yes |
| 55 / 100 | 55 | Lean Yes |
| 54 / 100 | 54 | Balanced |
| 46 / 100 | 46 | Balanced |
| 45 / 100 | 45 | Lean No |
| 36 / 100 | 36 | Lean No |
| 35 / 100 | 35 | Strong No |
| 0 / 100 | 0 | Strong No |

### 1.4 Empty-state semantics

- **No items at all** (`total == 0`): label **Balanced**, `pct = 50`, and the UI must show a distinct *"No entries yet"* state rather than implying neutrality was measured. The 50% is a placeholder, **not** a finding.
- **Pros only / Cons only**: computed normally; the UI must show that one side is empty, since a one-sided ledger is incomplete information.

### 1.5 Wording constraint

Display copy must read as a **summary of entered weight**, e.g. *"62% of entered weight is on the upside."*
It must never read as advice: ❌ *"You should go ahead."*

---

## 2. Weighted Comparison Matrix (signature)

### 2.1 Inputs

```
options   = [{ id, name }]
criteria  = [{ id, name, weight, scores: { [optionId]: number }, notes: { [optionId]: string } }]
```

### 2.2 Formulas

```
maxPossible = Σ (c.weight × 10)              for c in criteria
rawScore(o) = Σ (score(c, o) × c.weight)     for c in criteria
pct(o)      = (maxPossible > 0) ? round_half_up(rawScore(o) / maxPossible × 100) : 0
```

where `score(c, o)` is `c.scores[o.id]` **if present and valid, otherwise the cell is treated as MISSING** (see §2.4).

> **Critical correction to the prototype:** the prototype *displayed* `?? 5` for a missing score but *computed* with `?? 0` (audit **W2**). Display and calculation disagreed. In this implementation a missing score is **never** guessed — it is reported as missing.

### 2.3 Ranking

```
rank by rawScore descending
```

**Tie handling (prototype had none — W4):**

- Compare `rawScore` at full precision (no rounding before comparison).
- If two options have equal `rawScore`, they receive the **same rank** (competition ranking: 1, 1, 3).
- Tie-breakers are **not** used to invent a winner. The UI must display *"Tied"* and name all tied options.
- If `maxPossible == 0` (all criteria weights invalid/absent) ⇒ every option gets `pct = 0` and the matrix reports **"No valid criterion weights"** instead of ranking (prototype defect **W5**).

**Margin:**

```
margin(o1, o2) = rawScore(o1) - rawScore(o2)      (o1 = leader, o2 = runner-up)
```

The dashboard calls a race **"close"** when `margin <= 5% of maxPossible` (not a fixed 5 points — the prototype's fixed threshold did not scale with matrix size).

### 2.4 Missing / incomplete cells

A cell is **MISSING** when the score is absent, `null`, `undefined`, non-numeric, `NaN`, or outside 1–10.

| Situation | Effect |
|---|---|
| Some cells missing | Option's `rawScore` computed over **available cells only**; the option is flagged **"incomplete"** and shown with a coverage indicator (e.g. `7/9 cells scored`) |
| All cells for an option missing | `rawScore = 0`, flagged incomplete, **excluded from "leader" designation** |
| All cells in a criterion missing | Criterion contributes 0 to `maxPossible`? **No** — the criterion still counts toward `maxPossible` (its weight is real), so incomplete options score lower and are visibly flagged. The gap is disclosed, never hidden |

**Rule:** incompleteness is always **surfaced**, never averaged away. An incomplete option may still lead, but must be labelled incomplete so the user knows the ranking rests on partial data.

### 2.5 Score breakdown

For each option, expose the per-criterion contribution:

```
contribution(c, o) = score(c, o) × c.weight
```

UI shows `contribution / (c.weight × 10)` per cell so the user can see exactly why a total is what it is. This is the foundation for future sensitivity analysis ("what if I change my priorities?") — contributions are already separated per criterion.

### 2.6 Interpretation wording

- ✅ *"Under your current criteria and weights, Option A ranks first at 78%."*
- ✅ *"This reflects the priorities you entered, not an objective measure."*
- ❌ *"Option A is the best choice."*
- ❌ Any combined score presented as scientific certainty.

---

## 3. SWOT Analysis

### 3.1 Inputs

```
swot = { strengths, weaknesses, opportunities, threats }   // each [{ id, text, impact }]
impact ∈ { High, Medium, Low }
```

### 3.2 Categorisation (fixed)

| Quadrant | Axis | Polarity |
|---|---|---|
| Strengths | Internal | Helpful |
| Weaknesses | Internal | Harmful |
| Opportunities | External | Helpful |
| Threats | External | Harmful |

Internal = Strengths + Weaknesses · External = Opportunities + Threats
Helpful = Strengths + Opportunities · Harmful = Weaknesses + Threats

### 3.3 Derived signals

SWOT counts are **counts of user-entered items**, weighted by impact only for risk flagging:

```
helpfulCount = |strengths| + |opportunities|
harmfulCount = |weaknesses| + |threats|

highImpactRisks = [w in weaknesses where w.impact == High]
                ∪ [t in threats      where t.impact == High]
```

**No numeric "SWOT score" is produced.** The prototype showed raw counts (helpful vs harmful) which is honest; we keep that and add impact-weighted risk flagging. We deliberately do **not** convert SWOT into a number to be added to other numbers (brief §5F explicitly forbids it).

### 3.4 Posture label (deterministic, disclosed)

| Condition | Posture |
|---|---|
| `helpfulCount == 0 && harmfulCount == 0` | **Not assessed** (empty state) |
| `highImpactRisks > 0` | **Exposed** — high-impact risk present |
| `harmfulCount > helpfulCount` | **Strained** |
| `helpfulCount > harmfulCount` | **Favourable** |
| `helpfulCount == harmfulCount` | **Balanced** |

Ties resolved by the `highImpactRisks` rule first, so a single High threat always outranks a count tie.

---

## 4. Verdict Dashboard

### 4.1 Design rule (from brief §5F)

> *"Do not simply add unrelated scores together and call them a scientific overall verdict."*

Therefore: **there is no single composite score.** The dashboard presents four independent, clearly-labelled signals plus a gap analysis.

### 4.2 Signal cards (each labelled with its source)

| # | Signal | Type | Source |
|---|---|---|---|
| 1 | Pros & Cons balance | **Calculated** | §1 |
| 2 | Comparison leader + margin | **Calculated** | §2 |
| 3 | SWOT posture | **Calculated** | §3 |
| 4 | Completeness | **Calculated** | §4.3 |

Each card must carry a badge: `CALCULATED` · `INTERPRETATION` · `RECOMMENDATION`. This satisfies the brief's requirement to distinguish the three.

### 4.3 Completeness / missing information (new — prototype lacked it, W23)

Deterministic checks, each producing a concrete, actionable message:

| Check | Trigger |
|---|---|
| No criteria defined | `criteria.length == 0` |
| No options defined | `options.length == 0` |
| Matrix has missing cells | any option flagged incomplete |
| No criterion weights set | `maxPossible == 0` |
| No pros or no cons entered | either list empty |
| SWOT quadrant empty | any of the four empty |
| No High-impact items anywhere | no item at High |
| Description empty | `description` blank (decision lacks context) |
| Tied ranking | leader tied with another option |
| Close race | `margin <= 5% of maxPossible` |

**Completeness score** (honest, not a quality score):

```
checks = 10 defined above
completeCount = number of checks passing
completenessPct = round_half_up(completeCount / 10 × 100)
```

Label: **`completenessPct` = how much of the decision record has been filled in** — explicitly *not* how good the decision is.

### 4.4 Recommendations (rule-based, transparent)

Each recommendation is produced by a named rule; the UI shows the rule's trigger. No recommendation is emitted without a triggering condition — no filler text.

| Rule ID | Condition | Recommendation |
|---|---|---|
| `R-MATRIX-EMPTY` | no options or no criteria | Complete the comparison matrix before relying on a ranking |
| `R-INCOMPLETE` | any incomplete option | Fill the missing score(s) — a ranking on partial data can reverse |
| `R-TIE` | tied leader | Top options are tied; revisit your highest-weighted criteria |
| `R-CLOSE` | close race | Leader is ahead by a narrow margin; small weight changes could flip it |
| `R-RISK` | `highImpactRisks > 0` | Mitigate the flagged high-impact risk before committing |
| `R-SO` | ≥1 strength **and** ≥1 opportunity | Consider using a strength to capture an opportunity |
| `R-CONTEXT` | description empty | Add context (deadline, goal, constraints) so the record is explainable later |
| `R-ONE-SIDED` | pros empty or cons empty | The ledger is one-sided; actively list the other side |
| `R-SWOT-EMPTY` | any SWOT quadrant empty | Complete the SWOT quadrants to surface external factors |
| `R-NO-HIGH` | no High-impact item anywhere | Consider whether any factor truly is high-impact — everything may be under-rated |

Recommendations are ordered by severity: data-integrity issues → risk → strategic opportunities → completeness.

### 4.5 What the dashboard must never do

- ❌ Combine pros/cons %, matrix %, and SWOT counts into one "overall score"
- ❌ Use words like "correct", "optimal", "guaranteed", "scientific"
- ❌ Emit a recommendation with no triggering condition
- ❌ Hide incompleteness behind a confident-looking number

---

## 5. Edge Case Matrix (every row is a unit test)

| # | Input | Required behaviour |
|---|---|---|
| E1 | No pros, no cons | `pct=50`, label Balanced, UI shows "No entries yet" |
| E2 | Pros only, 1 item wt 10 | `pct=100`, Strong Go, UI notes cons side empty |
| E3 | Weight = 0 on a pro | **Rejected** at validation; not stored |
| E4 | Weight = `NaN` / `"abc"` | **Rejected**; never propagates to totals |
| E5 | Weight = 15 | **Rejected** (range 1–10), field shows error |
| E6 | Weight = 3.6 | Rounded to 4, then accepted |
| E7 | No criteria | `maxPossible=0`; UI shows "No criteria" state, no ranking |
| E8 | All criterion weights invalid | `maxPossible=0`; **"No valid criterion weights"** state |
| E9 | Criteria exist, no options | Leader absent; dashboard `R-MATRIX-EMPTY` |
| E10 | Missing score cell | Cell reported MISSING; option flagged incomplete; **not** defaulted to 5 or 0 |
| E11 | Score = 0 | **Rejected** (range 1–10) |
| E12 | Score = 11 | **Rejected** |
| E13 | Score = `NaN` | Treated as MISSING + rejected on input |
| E14 | Two options, identical scores | **Tied**, both rank #1, UI says "Tied" |
| E15 | Three options, 1st=2nd>3rd | Ranks 1, 1, 3 |
| E16 | Option with all cells missing | `rawScore=0`, excluded from leader, flagged |
| E17 | Zero options | Empty state, no crash |
| E18 | 1 option, 1 criterion | Ranking of 1; `pct` computed normally |
| E19 | Very large weights (all 10) | No overflow; normal results |
| E20 | Tied leader + close margin | Both `R-TIE` and `R-CLOSE` may fire; both shown |
| E21 | Empty decision (everything blank) | Completeness 0%; "Not assessed" postures; no fabricated verdict |
| E22 | `round_half_up(0.5)` = 1, `round_half_up(1.5)` = 2 | Deterministic rounding, locale-independent |
| E23 | pct exactly 65 / 55 / 45 / 35 | Band boundaries per §1.3 table |
| E24 | Imported data with negative weight | Validation rejects the record with a clear error; existing data untouched |
| E25 | Non-integer score after coercion | Rounded then range-checked per §0.1 |

---

## 6. Test Requirements (Phase 2 exit gate)

- Engine tests run with **zero DOM and zero React imports**.
- Minimum coverage target: **every formula in §1–§4** and **every row of §5**.
- Property-style checks: for any valid input, `0 <= pct <= 100` and ranking is a total order.
- A regression test must exist for each prototype defect **W1–W6** and **W22–W23**.
- `npm test` must be green before any UI work is merged over it.

---

## 7. Future-Proofing Notes (not built now)

- Per-criterion `contribution()` already supports **sensitivity analysis** ("what if I change my priorities?").
- Pure functions are directly reusable for **decision trees**, **cost-benefit**, and **AHP** later.
- `maxPossible` normalisation means matrices of different sizes are comparable in *percentage* terms, which enables future cross-decision dashboards.
