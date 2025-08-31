## Loopback MCP in CRUDService – Release Notes and Deep Dive

Note: A versioned release notes page is now available. See `releases/loopback_mcp_1_0.md` for the current canonical record. This page remains for historical context and deep‑dive details.

### What’s done

- **Loopback MCP server in CRUDService**
  - Endpoints: `GET /mcp/tools/list` and `POST /mcp/jsonrpc` (tools/list, tools/invoke).
  - Auth scopes enforced: `mcp.tools.discovery`, `mcp.tools.invoke` with 403 on missing scopes.
  - Structured logging with durations and correlation IDs.
  - CSRF and OriginValidation exemptions for `/mcp/*`.

- **Tool generation and catalogue**
  - `LoopbackToolGenerator` builds tools from systems and workflows (resilient to partial YAML).
  - `ToolCatalogue` auto-includes loopback MCP tools and merges with built-ins and any external MCP.
  - Auto-refresh after system/workflow create/update/delete.
  - Deterministic naming + identity:
    - Default strategy: namespaced `provider.instance.base` (e.g., `entra.cont.account.get_by_id`, `auth0.core.account.get_by_id`, `ldap.av.account.get_by_dn`).
    - Per-system identity via `mcpInstance` in system YAML: `{ provider, instance, instance_label, env }`.
    - 50-char cap with stable hash; pre-cap and final name collision checks (fail-fast with owners).
    - Optional Router surface (off by default) publishes short names with `oneOf` schema per provider.

- **BFF routing**
  - Proxies added:
    - `GET /api/crud/mcp/tools/list` → CRUD `/mcp/tools/list`
    - `POST /api/crud/mcp/jsonrpc` → CRUD `/mcp/jsonrpc`
    - `GET|POST /api/crud/mcp/*` → CRUD `/mcp/{path}`

- **Frontend (Visual Designer)**
  - Tool Picker modal improved for scale: All/Built-in/MCP filter, debounced search, dedupe with `alreadySelected`, larger page size.
  - Hooks (`useToolList`, `useToolSearch`) and service wired to ToolCatalogue endpoints.
  - Agent console streaming UI: strips control JSON, concise final status, improved awaiting-input form; helpers configurable via YAML.

- **Stability and tests**
  - Tests passing for: MCP list/invoke (unit + integration), ToolCatalogue merge, tool routes, and agent suites.
  - Safer imports (plugin fallback), OTEL off in tests, FIPS bypass knob for test env.

- **Docs**
  - Persona-focused guide and loopback MCP how-to added.

---

### Scenarios that work now

- **Discover tools**
  - Via CRUDService: `GET /mcp/tools/list`
  - Via BFF: `GET /api/crud/mcp/tools/list`
  - Via ToolCatalogue: `GET /tools/list`, `GET /tools/search` (returns built-ins + loopback MCP).

- **Invoke tools**
  - JSON-RPC `tools/invoke` for system commands: executes via `CommandExecutor` with schema validation. Use namespaced names:
    - Entra ID: `entra.cont.account.get_by_id` (args: `SystemIdentifier`), `entra.cont.group.get_by_id`, `entra.cont.device.get_by_id`.
    - Active Directory (on-prem LDAP): `ad.devdomain1.account.get_by_id`, `ad.devdomain1.group.get_by_id`.
    - Auth0: `auth0.core.account.get_by_id`.
    - LDAP (OpenLDAP): `ldap.av.account.get_by_dn`, `ldap.av.account.get_by_email`.
  - JSON-RPC `tools/invoke` for workflows: returns “accepted” stub by default; direct start available when `MCP_LOOPBACK_WORKFLOW_DIRECT_INVOKE=true`.

- **UI selection at scale**
  - Agent editor can open the Tool Picker modal, search/filter hundreds+ of built-ins and MCP tools, and select without duplicates.

- **Agent run UX**
  - Streamed output renders cleanly (no raw control JSON), clear completion status, and server-driven helpers/actions.

- **Security and governance**
  - Missing discovery/invoke scopes → 403 (tested). Same PDP/auth path as CRUDService.

---

### External MCP client support (e.g., Cursor)

External MCP clients can use REST for discovery or JSON-RPC 2.0 over HTTP for discovery and invoke to connect directly to CRUDService (or via BFF) and use its tools. Names are stable and globally unique by default (`provider.instance.base`).

0) REST tools discovery (read-only)

Via BFF:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  https://<bff-host>/api/crud/mcp/tools/list
```

Direct to CRUDService (in-cluster/local):

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://crud-service:8000/mcp/tools/list
```

Response (shape):

```json
{"tools":[{"name":"system.my_obj.my_action","description":"...","inputSchema":{...},"source":"system","metadata":{...}}]}
```

1) Tools discovery (JSON-RPC)

Request:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  https://<bff-host>/api/crud/mcp/jsonrpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/list"}'
```

Response (shape):

```json
{"jsonrpc":"2.0","id":"1","result":{"tools":[{"name":"system.my_obj.my_action","description":"...","inputSchema":{...},"source":"system","metadata":{...}}]}}
```

2) Tool invocation (system command)

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  https://<bff-host>/api/crud/mcp/jsonrpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":"2",
    "method":"tools/invoke",
    "params":{"name":"system.my_obj.my_action","arguments":{"k":"v"}}
  }'
```

3) Tool invocation (workflow)

Default (accepted stub):

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  https://<bff-host>/api/crud/mcp/jsonrpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":"3",
    "method":"tools/invoke",
    "params":{"name":"workflow_onboard_user","arguments":{"userId":"abc"}}
  }'
```

Direct start (enable): set `MCP_LOOPBACK_WORKFLOW_DIRECT_INVOKE=true` on CRUDService.

#### Cursor compatibility

- If Cursor (or any MCP-capable client) supports HTTP JSON-RPC endpoints, it can:
  - Call `tools/list` and `tools/invoke` via `https://<bff-host>/api/crud/mcp/jsonrpc`.
  - Or directly `https://<crud-service-host>:8000/mcp/jsonrpc` inside the cluster.
- Requirements:
  - The client must include `Authorization: Bearer <token>` with scopes: `mcp.tools.discovery` for list, `mcp.tools.invoke` for invoke.
  - JSON-RPC 2.0 payloads as shown above.

If Cursor requires WebSocket transport for MCP, use the BFF proxy when WS-to-HTTP translation is available; otherwise, HTTP JSON-RPC mode is supported today.

---

### Configuration checklist

- CRUDService
  - Ensure `ConfigLoader` points to ServiceConfigs dirs.
  - Naming/identity:
    - Default: `MCP_NAMING_STRATEGY=global_namespace` (namespaced). Fallback suffix mode if `provider/instance` missing.
    - Add `mcpInstance` to each system to set `{ provider, instance, instance_label, env }`.
  - Limits and safety:
    - `MCP_MAX_TOOLS` to cap publication.
    - `MCP_DUPLICATE_POLICY=fail` to fail-fast on collisions (pre-cap and final).
  - Workflows: optionally set `MCP_LOOPBACK_WORKFLOW_DIRECT_INVOKE=true` to start workflows on invoke.
  - OTEL envs optional; disabled in tests.

---

### Real-world problems solved (and why these changes)
- Host flattening and collisions: Some clients flatten catalogs or cap tool name length. Namespaced `provider.instance.base` avoids cross-tenant collisions; a 50-char cap with deterministic hash preserves stability.
- Different parameter shapes under same concept: Entra vs AD vs LDAP all have “get_by_id” but require different arguments. Namespaced surface keeps schemas distinct; optional Router surface offers a single short name with `oneOf` branches and strict validation.
- Per-instance labeling and search: `mcpInstance.instance_label` and allowlisted annotations (`provider`, `instance`, `env`) enable clear UI titles and filters.
- Deterministic catalogs at scale: Sorted iteration and fail-fast duplicate checks remove jitter and prevent ambiguous names.

```mermaid
flowchart LR
  A[System YAML<br/>+ mcpInstance] --> B[Generator]
  B -->|namespaced| C[Tools: provider.instance.base]
  B -->|router (opt)| D[Short-name Router Tools]
  C --> E[tools/list]
  D --> E
  style D stroke-dasharray: 3 3
```

- BFF
  - Routes present for MCP: `/api/crud/mcp/tools/list`, `/api/crud/mcp/jsonrpc`, `/api/crud/mcp/*`.

- Frontend
  - Tool Picker uses `/api/crud/tools/*` (ToolCatalogue) for merged built-ins + MCP.

---

### Troubleshooting

- 403 on tools/list or invoke → check scopes on the Bearer token.
- No workflow direct run → ensure `MCP_LOOPBACK_WORKFLOW_DIRECT_INVOKE=true` and `/workflow/start` is enabled.
- Missing tools → check ServiceConfigs YAML and refresh; ToolCatalogue auto-refreshes after CRUD changes.


