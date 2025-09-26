---
product: shield
persona: Developers
journey_stage: consideration
triggers: ["Token leakage incident", "SSE instability", "Spend overruns"]
pain_points:
  primary: "Token risk and complex auth code"
  secondary: "No runtime budget enforcement"
decision_criteria: ["dev_effort", "latency", "observability"]
objections: ["Gateway sprawl", "Breaking changes"]
required_assets: ["golden_path_spa", "5min_demo", "migration_guide"]
success_metrics: {demo_cta: ">15%", p95_latency_ms: "<50"}
lastReviewed: 2025-09-26
---

## Narrative

Problem → token risk & spend leakage; Failed attempts → front-end SDKs; Resolution → backend-only tokens + PDP mapping + budgets.

## CTAs

Try the SPA Golden Path → Watch demo → Migration workshop booking.

