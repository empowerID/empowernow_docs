---
title: Aria Shield Controls Reference
---

This page maps the seven controls to technical documentation, key settings, and verification steps. Use this as the canonical reference from website and service docs.

## 1) User‑Bound Agent Identities
- Concept: `../seven-controls-overview.md#1-user-bound-agent-identities`
- Technical: IdP Passports — `../../idp/index.md`
- Settings: IdP issuance and claims (see IdP docs)
- Verify: Attempt cross‑user call → expect deny (binding mismatch)

## 2) Tool Schema Attestation
- Concept: `../seven-controls-overview.md#2-tool-schema-attestation`
- Technical: Tool Registry — `./tool-schema-attestation.md`
- Settings: Registry pins, rollout windows (Tool Registry service)
- Verify: Flip schema hash → expect deny until approved

## 3) Capability Proofs
- Concept: `../seven-controls-overview.md#3-zero-knowledge-capability-proofs`
- Technical: Membership PIP — `../../membership/index.md`
- Settings: Capability catalog in Membership/Policies
- Verify: Invoke without capability → expect deny; with capability → permit

## 4) Plan Contracts (Spend Guard)
- Concept: `../seven-controls-overview.md#4-plan-contracts-spend-guard-included`
- Technical: BFF streaming caps, PDP constraints — `../../bff/reference/streaming.md`, `../../bff/reference/pdp-reference.md`
- Settings: Budgets/effective budgets — `../../pdp/reference/effective-budgets.md`
- Verify: Exceed caps or alter step → expect deny with reason

## 5) Context‑Root Binding
- Concept: `../seven-controls-overview.md#5-context-root-binding`
- Technical: Gateway request shaping — `../../bff/explanation/bff_gateway_technical.md`
- Settings: Reference inputs and hashing strategy (Gateway)
- Verify: Change trusted context → expect mismatch deny

## 6) Behavioral DNA (BDNA) Monitoring
- Concept: `../seven-controls-overview.md#6-behavioral-dna-bdna-monitoring`
- Technical: Analytics/Profiles — see Analytics service
- Settings: Drift thresholds and observe/enforce modes
- Verify: Trigger drift scenario → observe score → enforce threshold

## 7) Intent Receipts (Receipt Chains)
- Concept: `../seven-controls-overview.md#7-intent-receipts-receipt-chains`
- Technical: Receipt Vault — `./receipt-chains.md`
- Settings: Signing/anchoring configuration (Vault)
- Verify: Check signed receipts with prev_hash continuity

---

## Cross‑service links
- BFF reference (settings, routes): `../../bff/reference/settings-reference.md`, `../../bff/reference/routes-reference.md`
- PDP flags: `../../pdp/reference/settings-flags.md`
- Membership schema/endpoints: `../../membership/reference/schema-and-endpoints.md`

## Notes
- Website product pages should link here instead of duplicating control descriptions.
- Use this page to verify end‑to‑end control posture in tests and runbooks.
