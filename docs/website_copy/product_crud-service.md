---
lastReviewed: 2025-09-26
claims:
  - { key: idempotent_workflows, proof: { type: reference, ref: "/docs/services/crud-service/explanation/idempotency.md" } }
  - { key: approvals, proof: { type: reference, ref: "/docs/services/crud-service/explanation/approvals-overview.md" } }
  - { key: retries_slo, proof: { type: reference, ref: "/docs/services/crud-service/reference/approval-tasks-and-apis.md" } }
  - { key: connectors, proof: { type: reference, ref: "/docs/services/crud-service/index.md" } }
  - { key: eventing, proof: { type: reference, ref: "/docs/services/crud-service/reference/approval-tasks-and-apis.md" } }
---
# CRUD Service — Identity Operations Plane

Make identity workflows reliable, auditable, and observable with idempotent operations, approvals, and connectors.

## Problem → Value

- Problem: brittle scripts, ad‑hoc retries, and approvals create long MTTR and audit gaps.
- Value: predictable SLOs, clean audit linkage to policy, and faster launches using templates and connectors.

## How it works (at a glance)

```mermaid
flowchart LR
  IN[Ops/Events] --> DEDUPE[Idempotent Dedupe]
  DEDUPE --> WF[Workflows & Approvals]
  WF --> EXEC[Executors/Connectors]
  EXEC --> EV[Events/Logs]
  EV --> ANA[Analytics]
  WF --> RCPT[Receipts]
```

1) Receive op → dedupe by `event_id` → persist → orchestrate approvals.
2) Execute with retries and circuit breakers; emit receipts/logs.
3) Stream to analytics.

## Agent Workflow Explainability (V3)

- Self-describing WAITING responses tell any client exactly what to do next and how to resume safely.
- Safety metadata: state_version (concurrency), idempotency_key (replay dedupe), fingerprint (audit join), plus an MCP tool facade to resume without SDKs.

```mermaid
sequenceDiagram
  participant Agent as MCP Agent/UI
  participant API as CRUDService API
  participant EX as Graph Engine
  participant UH as USER_INTERACTION

  Agent->>API: POST /workflow/start { name, data }
  API->>EX: run_workflow()
  EX-->>Agent: WAITING { required_action, request_format, state_version, idempotency_key, fingerprint }
  Agent->>API: POST /workflow/resume (If-Match: state_version)
  EX->>UH: approval/form (or continue)
  EX-->>Agent: next WAITING or COMPLETED
```

## Demo snippet (talk track)

- Bulk import with partial failures → deterministic retry shows only remaining items.
- Approval path enforces policy and records decisions.
- Permit → cryptographic receipt correlates with PDP decision.

## FAQ

- How do you guarantee idempotency? By deduping on stable correlation/event IDs across steps.
- What’s the approval model? Multi‑step, policy‑linked paths with audit.

## See also

- Services overview: `/docs/services/crud-service/index.md`
- Idempotency: `/docs/services/crud-service/explanation/idempotency.md`
- Approvals: `/docs/services/crud-service/explanation/approvals-overview.md`
