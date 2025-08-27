# Solution — Regulated Industries

## The problem
Regulatory requirements demand provable controls on identities, data access, and changes. AI agents increase risk without standardized authorization and audit.

## The ARIA approach
- Identity with pairwise subjects and optional DPoP binding at issuance
- AuthZEN‑profiled decisions: constraints/obligations enriched by Membership graph
- Data governance: `data_scope` (tenant_ids + row filter), `step_up` MFA hints
- Boundary enforcement: schema pins, params/egress allowlists, plan/budgets
- Cryptographic receipts: signed, hash‑chained records for each permit

## Outcomes
- Consistent, explainable policy decisions
- Enforced data boundaries and step‑up where needed
- End‑to‑end, verifiable audit trails

## Getting started
- Define data_scope and step_up in policy; enable Membership PIP
- Turn on receipts and configure retention/export
- Pilot a workflow with zero‑shot orchestration and guardrails

CTAs: Book a compliance demo · See data_scope examples · View receipt chain
