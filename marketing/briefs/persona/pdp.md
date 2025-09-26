---
product: pdp
persona: Security Architect
journey_stage: evaluation
triggers: ["Inconsistent denies", "AI tool drift", "Regulatory pressure"]
pain_points:
  primary: "Inconsistent decisions across surfaces"
  secondary: "No explainable deny/permit"
decision_criteria: ["standard_contract", "latency", "extensibility"]
objections: ["We already have OPA", "Performance concerns"]
required_assets: ["reference_deep_dive", "demo_env", "migration_guide"]
success_metrics: {poc_pass: "\u226590% criteria", latency_p50_ms: "<10"}
lastReviewed: 2025-09-26
---

## Narrative

Problem → fragmentation; Failed attempts → per-service allowlists; Resolution → AuthZEN PDP + PIP + conservative merge.

## Journey (Mermaid)

```mermaid
flowchart LR
  T[Trigger] --> Pain[Policy drift]
  Pain --> Attempts[Ad hoc rules]
  Attempts --> Solution[AuthZEN PDP]
  Solution --> Next[POC]
```

## CTA Ladder

- Soft: AuthZEN explainer
- Medium: Decision explorer demo
- Hard: POC with your policies

