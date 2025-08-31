## Loopback MCP – Ops checklist

Use this checklist to validate an environment end‑to‑end.

### Routing
- BFF routes present:
  - GET `/api/crud/mcp/tools/list` → CRUD `/mcp/tools/list`
  - POST `/api/crud/mcp/jsonrpc` → CRUD `/mcp/jsonrpc`

### Auth/scopes
- Tokens used have:
  - `mcp.tools.discovery` for listing
  - `mcp.tools.invoke` for invoking

### CRUDService config
- `MCP_MAX_TOOLS` set appropriately
- `MCP_DUPLICATE_POLICY=fail` (recommended)
- `MCP_LOOPBACK_WORKFLOW_DIRECT_INVOKE` only enabled in dev/test
- `OTEL_DISABLED=true` in tests/local

### Tool generation
- Systems annotated with `mcp.enabled: true` where needed
- Workflows define `inputs` schema for better UX
- `mcpInstance` filled to drive namespacing and labeling

### Verification steps
1) `GET /api/crud/mcp/tools/list` returns expected tools
2) `tools/call` health with `{ verbose: true }` succeeds
3) Invoke at least one system tool and one workflow tool
4) Visual Designer Tool Picker lists and filters MCP tools
5) Structured logs show `mcp_*` events with correlation IDs

### Troubleshooting
- 403 → missing scopes or session/auth failure
- Empty list → check ServiceConfigs mount, validation errors, or publish cap
- Name collisions → see logs; adjust naming or set duplicate policy


