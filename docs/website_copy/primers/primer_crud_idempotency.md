# Primer — Idempotent Identity Workflows & Approvals

## What it is

An operations plane where identity workflows dedupe by stable IDs, retry safely, and route through policy-linked approvals.

## Why it matters

- Prevents duplicate changes and data drift
- Cuts MTTR with deterministic retries
- Delivers audit-ready approvals

## How it works

```mermaid
flowchart LR
  IN[Ops/Events] --> D[Idempotent Dedupe]
  D --> WF[Workflows & Approvals]
  WF --> EX[Executors]
  EX --> EV[Events/Logs]
  EV --> ANA[Analytics]
```

1) Accept event → dedupe → persist
2) Execute with retry/circuit policies
3) Record approvals and receipts

## Pitfalls to avoid

- Retrying without dedupe → duplicates
- Ad-hoc approval emails → audit gaps

## See also

- `/docs/services/crud-service/index.md`
- `/docs/services/crud-service/explanation/idempotency.md`
- `/docs/services/crud-service/explanation/approvals-overview.md`
