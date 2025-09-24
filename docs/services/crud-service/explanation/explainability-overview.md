---
title: Explainability – Self‑Describing Workflows (Overview)
---

At every USER_INTERACTION gate, the engine returns a self‑describing WAITING response telling any client exactly what to do next and how to do it safely. Side‑effects run only in ACTION nodes under concurrency/idempotency/audit.

```mermaid
sequenceDiagram
  participant Client
  participant API as Workflow API
  participant EX as Engine
  Client->>API: POST /workflow/start
  API->>EX: run_workflow()
  EX-->>Client: WAITING { required_action, request_format, state_version, idempotency_key }
  Client->>API: POST /workflow/resume (If-Match: state_version)
  EX-->>Client: Next WAITING or COMPLETED
```

See also
- Contract reference: `services/crud-service/reference/waiting-contract.md`
- Adoption guide: `services/crud-service/how-to/agent-adoption.md`
- Cheat sheet: `explainability_cheat_sheet.md`

