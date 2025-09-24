---
title: Agent Adoption (REST + MCP)
---

## REST loop
1) Start: `POST /workflow/start { name, data }`
2) Read WAITING
3) Resume: `POST /workflow/resume/{task_id}` with `If-Match: <state_version>` and `idempotency_key`

## MCP loop
1) `tools/list` → discover helpers
2) `systems.describe_command` → required params
3) `workflow.schema_start` (validate and/or start)
4) `workflow.resume` per `mcp_request_format`

See also
- Contract: `services/crud-service/reference/waiting-contract.md`
- Cheat sheet: `explainability_cheat_sheet.md`

