---
title: WAITING Contract Reference
---

Fields
- `workflow_status`: string (waiting|completed|failed)
- `state_version`: integer (monotonic)
- `required_action`: `{ task_type, task_name, allowed_decisions? }`
- `request_format`:
  - `method`: POST
  - `url`: `/workflow/resume/{task_id}`
  - `headers`: include `If-Match: <state_version>`
  - `body`: `{ task_id, decision|data, state_version, idempotency_key }`
  - `fingerprint`: stable hash over method+url+body-keys+node+state_version
  - `idempotency_key`: suggested value
- `mcp_request_format`: mirrors `request_format` (tool `workflow.resume`)
- `_links`: `{ self, resume }`
- `contract_version`: string (e.g., "1.0")

Notes
- Return 409 when `If-Match`/`state_version` is stale; include refreshed WAITING
- Idempotent replay returns prior response when `idempotency_key` repeats
- Redact example values honoring `x-redact`

See also
- Engine loop: `services/crud-service/explanation/execution-loop.md`
- User interaction/resume: `services/crud-service/explanation/user-interaction-resume.md`

