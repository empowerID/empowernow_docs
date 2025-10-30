# FAQ — Orchestration Service (Identity Operations)

## How do you guarantee idempotency?
We dedupe by durable event/correlation IDs across steps and persist workflow state so retries don’t re‑apply.

## What kinds of approvals are supported?
Multi‑step, policy‑linked approvals with audit trails and resolver integrations.

## How are failures handled?
Deterministic retry policies and circuit breakers. Partial failures re‑queue only remaining items.

## Can I plug in custom connectors?
Yes. Use the connector surface to add targets; observe via events/logs.

## How do I correlate receipts with operations?
Receipts include decision IDs and policy snapshots; operations persist call IDs and link to receipts.

## What is the typical MTTR improvement?
Depends on baseline; pilots target ≥50% reduction vs scripts.

## See also
- `/docs/services/crud-service/index.md`
- `/docs/services/crud-service/explanation/idempotency.md`
- `/docs/services/crud-service/explanation/approvals-overview.md`
