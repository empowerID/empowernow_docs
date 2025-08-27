# Solution — DevSecOps

## The problem
Security needs to be built into delivery. AI agents amplify risk if identity, policy, and boundary enforcement are bolted on late.

## The ARIA approach
- Policy as a standard: AuthZEN evaluation for consistent permit/deny + constraints/obligations
- Context from the graph: Membership PIP for `data_scope`, `step_up`, `identity_chain`
- Enforcement where it counts: MCP PEP (schema/params/egress), BFF stream caps and budgets
- Proof by default: signed, hash‑chained receipts for every permit

## Outcomes
- Guardrails in code paths, not post‑hoc audits
- Faster reviews with explainable constraints and receipts
- Reusable policies across tools/providers

## Getting started
- Author baseline constraints (egress, params, tokens) and enable Membership PIP
- Wrap agent→tool calls with the ARIA Gateway
- Turn on receipts and integrate with your analytics pipeline

CTAs: Book a DevSecOps demo · Read AuthZEN guide · See Membership PIP
