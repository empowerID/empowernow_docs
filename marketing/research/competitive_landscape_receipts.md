# Competitive Landscape — AI Receipts Ledger

Scope: systems that approach auditability and explainability for AI agent/tool steps.

1) AI tracing/observability
- LangSmith, HoneyHive, Humanloop, W&B Prompts, Arize Phoenix, WhyLabs
- Strengths: traces, evals, prompt diffs, datasets
- Gaps: no JWS‑signed hash chain per step; no external anchors; limited PDP/budget linkage

2) Agent guardrails/gateways
- NeMo Guardrails, Lakera, Protect AI
- Strengths: policy/filters, safety, deny/allow
- Gaps: do not emit signed, hash‑chained receipts with plan/data/budget diffs; no anchoring

3) Cloud audit logs
- AWS CloudTrail, GCP Cloud Audit Logs, Azure Monitor
- Strengths: platform auditability, compliance
- Gaps: not plan/tool‑level diffs; no per‑step chain or anchor semantics

4) Ledger/anchoring infrastructure (complementary)
- Sigstore Rekor/Notary v2, C2PA, AWS QLDB, Azure Confidential Ledger
- Strengths: transparency/ledger, provenance, anchors
- Fit: use as anchor targets; not a receipts solution by itself

Differentiators
- Signed, hash‑chained receipts with external anchoring
- Human‑auditable diffs (plan/data/budget) and settle‑to‑actuals semantics
- First‑class policy linkage (AuthZEN decision_id/effect/constraints) and schema pins
- Commodity infra (ClickHouse + S3) and Grafana timeline UX
