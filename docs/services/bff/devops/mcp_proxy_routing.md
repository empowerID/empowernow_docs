## BFF MCP proxy routing to CRUDService

This guide shows how to expose CRUDService Loopback MCP endpoints through the BFF, including route entries, auth, CSRF implications, and environment flags.

### Overview
```mermaid
flowchart LR
  C[Clients / UIs / Agents] --> BFF[/api/crud/mcp/*]
  BFF --> CRUD[/mcp/*]
  CRUD --> GEN[Loopback MCP Generator]
```

### Routes to add (ServiceConfigs)
Add the following proxy routes in `ServiceConfigs/BFF/config/routes.yaml`:

```
GET  /api/crud/mcp/tools/list   ->  CRUD /mcp/tools/list
POST /api/crud/mcp/jsonrpc      ->  CRUD /mcp/jsonrpc
GET|POST /api/crud/mcp/*        ->  CRUD /mcp/{path}
```

Keep existing `/api/crud/tools/*` (ToolCatalogue) endpoints for merged catalogue access from Visual Designer.

### Security model
- BFF enforces session authentication and standard middlewares.
- CRUDService enforces scopes:
  - `mcp.tools.discovery` for listing
  - `mcp.tools.invoke` for invoking
- CRUDService exempts `/mcp/*` from CSRF/origin validation for server‑side clients; the BFF path (`/api/crud/mcp/*`) should be used from browsers.

### Environment flags (CRUDService)
- `MCP_LOOPBACK_WORKFLOW_DIRECT_INVOKE=true` – start workflows immediately when invoking (dev/test only)
- `OTEL_DISABLED=true` – disable OpenTelemetry locally/tests
- `MCP_MAX_TOOLS` – cap number of published tools
- `MCP_DUPLICATE_POLICY=fail` – fail fast on naming collisions

### Validation checklist
1. Deploy BFF with the routes above
2. Verify `GET /api/crud/mcp/tools/list` returns tools with a scoped token
3. Verify `POST /api/crud/mcp/jsonrpc` handles `tools/list` and `tools/call`
4. From Visual Designer, confirm `/api/crud/tools/*` works (merged catalogue)
5. Check structured logs for `mcp_*` events and correlation IDs end‑to‑end

### Troubleshooting
- 403 on list/invoke → missing scope on service token
- CSRF errors → ensure clients hit the BFF path, not CRUDService directly
- Empty list → confirm ServiceConfigs mount and ToolCatalogue refresh


