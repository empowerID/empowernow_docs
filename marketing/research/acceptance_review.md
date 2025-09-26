# Research & Content Acceptance Review

This checklist validates that each product (IdP, PDP, CRUD, Data Collector, ARIA Shield, ARIA MCP Gateway) meets the deliverables and quality bars.

## Scope

- Research artifacts present and fresh
- Web copy parity (Problem → Value → Proof → How) with claims/proof
- SERP strategy and instrumentation in place

## System view

```mermaid
flowchart LR
  R[Research JSONs\n+ SERP logs] --> B[Briefs\n(persona/solution/product)]
  B --> WWW[Website pages\n(product/primer/FAQ)]
  B --> BC[Battlecards]
  R --> CI[Research Guardian]
  WWW --> L[Copy Lint]
  WWW --> LK[Link Check]
  WWW --> M[Metrics Export]
```

## Per‑product checklist

- Competitor set ≥5 (3–6 direct + 2–3 adjacent) with evidence URLs (fresh ≤ 60d)
- SERP logs for T1/T2/T3 keywords (top‑20), angles noted
- Feature matrix, velocity brief, pricing brief, analyst/media note
- Battlecard v1 published
- Product page present with claims + proof links; “See also” links to reference
- Primer present; FAQ present; demo snippet present
- `lastReviewed ≤ 90d`

## Global checks

- UTM instrumentation for CTAs (soft/medium/hard)
- Metrics export JSONL validated
- CI: research guardian, copy lint, link check, site build

## Current status summary

- Completed: taxonomy, briefs, competitors (placeholders for all; PDP filled with real vendors), SERP CSV headers, ROI models, scripts (pull/lint/generators/link‑check/copy‑lint/UTM/metrics/ROI), product pages, primers, FAQs, battlecards, SERP strategies (all 6).
- Pending: research sprint evidence fill (IdP, CRUD, Collector, Shield, MCP), SERP logs population, acceptance verification per product after fills.

## Next steps

1) Fill evidence for IdP/CRUD/Collector/Shield/MCP competitor JSONs (quotes + URLs).
2) Populate SERP CSVs with top‑20 results and angles.
3) Re‑run CI and metrics validator; update `lastReviewed`.
