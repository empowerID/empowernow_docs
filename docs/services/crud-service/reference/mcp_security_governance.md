## MCP Security & Governance (CRUDService)

### Scope model
- `mcp.tools.discovery` – required to list tools via REST or `tools/list`
- `mcp.tools.invoke` – required to invoke via `tools/invoke|tools/call`

Scopes are validated in CRUDService. When proxied by the BFF, session auth is enforced at the edge and service‑side scopes are still required downstream.

### PDP and authorization
- Loopback MCP endpoints reuse CRUDService’s PDP settings. Enable/disable enforcement via `config/pdp.yaml` (`enable_authorization`).
- Accepts scopes in `user.scope` or `normalized_permissions`.

### Transport and CSRF
- CRUDService exempts `/mcp/*` from CSRF and origin validation for server‑side clients.
- Always use the BFF proxy (`/api/crud/mcp/*`) from browsers and enterprise UIs to keep session protections in place.

### Recommended deployment
- Expose `/api/crud/mcp/tools/list` and `/api/crud/mcp/jsonrpc` via BFF routing to CRUDService.
- Use session → service token flow in the BFF to call CRUDService with proper scopes.

### Observability
- Structured logs for `mcp_tools_list_*` and `mcp_jsonrpc_*` include correlation IDs and durations.
- Disable OpenTelemetry locally and in tests with `OTEL_DISABLED=true`.

### Environment flags and limits
- `MCP_LOOPBACK_WORKFLOW_DIRECT_INVOKE=true` – start workflows immediately on invoke (dev/test only).
- `MCP_MAX_TOOLS` – cap publication to protect clients with small catalogs.
- `MCP_DUPLICATE_POLICY=fail` – fail fast on naming collisions (pre‑cap and final names).
- `ALLOW_NONFIPS_FOR_TESTS=true` – optionally bypass FIPS in test environments.

### Threat considerations
- Tools expose actions; restrict publication to the minimum set needed.
- Prefer read‑only GET endpoints for MCP Resources; keep side‑effects behind roles and scopes.
- Ensure tokens used by agents/UIs carry only discovery/invoke scopes as needed.


