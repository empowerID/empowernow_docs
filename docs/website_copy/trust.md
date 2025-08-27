---
title: Trust
description: Security, compliance, and privacy posture for the marketing site.
---

# Trust & Security

## Security model
- DPoP‑bound token issuance (optional): binds tokens to a client’s key; replay cache for JTI
- Pairwise subjects: reduce cross‑audience linkability; `act.sub` encodes user→service agent relationship
- Graph‑derived constraints: `data_scope` row filters, `step_up` MFA hints, identity‑chain allowlists
- Boundary enforcement: schema pins, params allowlists, egress allowlists, plan/budgets
- Receipts: signed, hash‑chained audit records with policy/params snapshots

## Compliance posture
- Evidence: cryptographic receipts for permitted actions
- Controls: centrally authored policy (AuthZEN) and graph‑backed context (Membership)
- Observability: analytics tee without secrets or token bodies

## Responsible AI
- Policy‑driven constraints and step‑up responses
- Clear deny reasons and receipts to audit outcomes

CTAs: Read the security model · View a receipt chain · Contact security


