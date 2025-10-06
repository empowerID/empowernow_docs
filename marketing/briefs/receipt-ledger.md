# Brief — Receipt Ledger

Outcome: Tamper‑evident, audit‑ready receipts with clear diffs and anchors.

Why it wins
- Trust: cryptographic linkage; anchors prevent silent edits
- Clarity: plan/data/budget diffs
- Governance: maps to budgets, policies, approvals

Competitive landscape (quick view)
- AI tracing/observability (LangSmith, HoneyHive, Humanloop, W&B Prompts, Arize, WhyLabs): traces/evals; no signed hash‑chain; no anchors; no PDP/budget semantics
- Agent guardrails/gateways (NeMo Guardrails, Lakera, Protect AI): policy/filters; no chainable receipts with diffs/anchors
- Cloud audit logs (CloudTrail, Cloud Audit Logs, Azure Monitor): infra audit; not plan/tool diffs; no per‑step chain
- Ledger/anchoring infra (Sigstore Rekor/Notary, C2PA, QLDB, Azure Confidential Ledger): anchors/transparency; not AI receipts; use as anchors

Where it fits: Shield emits; PDP policy; ClickHouse/S3; Grafana timeline.

Links: /products/receipts/ and docs/services/receipts/*
