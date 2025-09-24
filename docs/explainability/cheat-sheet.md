---
title: Explainability Cheat Sheet
---

Use this quick reference when wiring clients to WAITING/RESUME.

Headers
- Resume must include `If-Match: <state_version>`
- Body includes `state_version` and `idempotency_key`

MCP
- `mcp_request_format`: `{ tool: "workflow.resume", args_schema: {...} }`

Errors
- 412 If‑Match stale; 409 body.state_version stale
- Idempotent replay returns prior response

See also
- Reference: `services/crud-service/reference/waiting-contract.md`

