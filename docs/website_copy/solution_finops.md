# Solution — FinOps Governance

## The problem
AI usage can sprawl quickly: token streams grow, tool chains expand, and costs shift between teams. Traditional gateways show cost; they rarely enforce budgets or plans in real time.

## The ARIA approach
- Enforce per‑agent budgets at runtime (idempotent debits keyed by `call_id`)
- Deny before tool calls when PDP says no (capability, egress, params, data_scope)
- Govern tool execution order and shape via plan contracts (JWS) and schema pins
- Capture signed, hash‑chained receipts for reconciliation and audit

## Outcomes
- Predictable spend with hard guardrails
- Auditable usage trails per agent and workflow
- Safer experimentation, faster approvals

## Pilot outline (2–3 weeks)
- Week 1: connect Tool Registry; model budget policy in PDP; enable receipts
- Week 2: enforce plan steps/budgets in Gateway/BFF; dashboards for receipts
- Week 3: expand to a second workflow; document runbook; tune PDP TTLs

CTAs: Book a FinOps demo · See budget/402 behavior · View receipt schema
