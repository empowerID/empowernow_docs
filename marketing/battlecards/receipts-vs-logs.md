# Battlecard — Receipts vs. Logs

- Trust: Receipts are signed and chained; logs are mutable and reorderable
- Clarity: Receipts include plan/data/budget diffs; logs bury deltas
- Governance: Receipts bind to PDP constraints and budgets; logs do not

Competitor categories
- AI tracing/observability (LangSmith, HoneyHive, Humanloop, W&B Prompts, Arize, WhyLabs): strong traces/evals; no cryptographic chain or anchoring; limited policy/budget semantics
- Agent guardrails/gateways (NeMo Guardrails, Lakera, Protect AI): pre‑exec enforcement; do not emit signed, chain‑anchored receipts with diffs
- Cloud audit logs (CloudTrail, Cloud Audit Logs, Azure Monitor): infra‑level audit; not per‑step plan diffs; no chain per step
- Ledger/anchoring infra (Sigstore Rekor/Notary, C2PA, QLDB, Azure Confidential Ledger): good anchors; not AI receipts; complementary

Positioning: Use Receipts for high‑value steps where explainability and tamper‑evidence matter; use logs for low‑value telemetry and troubleshooting.
