---
product: crud
persona: Platform Engineering
journey_stage: consideration
triggers: ["Provisioning backlog", "Audit gap on approvals", "Frequent rework"]
pain_points:
  primary: "Fragile identity ops and long MTTR"
  secondary: "No clean audit linkage"
decision_criteria: ["slo", "idempotency", "connector_coverage"]
objections: ["We have iPaaS", "Too much change"]
required_assets: ["how_to_migrate", "5min_demo", "roi_consult"]
success_metrics: {mttr_reduction: "\u226550%", failed_jobs: "\u2265-60%"}
lastReviewed: 2025-09-26
---

## Narrative

Problem → brittle scripts; Failed attempts → more scripts; Resolution → idempotent workflows with approvals & receipts.

## Journey (Mermaid)

```mermaid
flowchart LR
  T[Trigger] --> P[Pain]
  P --> F[Failed attempts]
  F --> R[Orchestration Service]
  R --> N[Next step]
```

## CTAs

Assessment → Demo → ROI session (ops time saved)

