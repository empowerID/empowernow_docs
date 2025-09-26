---
product: idp
persona: Security Leader
journey_stage: consideration
triggers: ["Shadow AI incident", "Key leakage report", "Audit finding on shared credentials"]
pain_points:
  primary: "No provable link between human intent and agent actions"
  secondary: "Uncontrolled key proliferation"
decision_criteria: ["proof_of_governance", "time_to_value", "integration_risk"]
objections: ["We already use OAuth", "This adds friction"]
required_assets: ["assessment", "5min_demo", "roi_consult"]
success_metrics: {mql: ">15%", engagement_min: 4, assessment_completion: ">60%"}
lastReviewed: 2025-09-26
---

## Narrative

Problem → keys & unprovable delegation create risk and audit drag. Failed attempts → rotate keys, manual reviews. Resolution → Agent Passports: pairwise, purpose-bound, provable chain.

## Journey (Mermaid)

```mermaid
flowchart LR
  T[Trigger] --> P[Pain]
  P --> F[Failed attempts]
  F --> R[Resolution: Agent Passports]
  R --> N[Next step]
```

## CTA Ladder

- Soft: Assess agent identity maturity
- Medium: Watch 5‑min Passports demo
- Hard: ROI consult on eliminating keys

## Talking points (by role)

- Board: breach reduction
- Legal: provable delegation
- SecOps: revocation & TTLs
- Platform: TE/RAR/DPoP
- FinOps: fewer incidents

