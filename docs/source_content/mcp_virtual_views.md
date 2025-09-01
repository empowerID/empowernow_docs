### Loopback MCP Virtual Views and Pagination

This guide explains how to expose filtered subsets of the CRUDService MCP tool catalog as "virtual" servers on distinct API paths, and how to use pagination for large catalogs.

## Where the configuration lives
- Default path: `ServiceConfigs/CRUDService/config/mcp_virtual_servers.yaml`
- Override via env: `MCP_VIRTUAL_SERVERS_FILE=/absolute/or/relative/path/to/mcp_virtual_servers.yaml`

The config is loaded at process start and is also hot‑reloaded on demand: when a request references an unknown view, the service attempts to reload the views file and, if needed, derives fallback views automatically (see below). After reloading the views index, the internal `ConfigLoader` caches are invalidated so changes to `mcpInstance` and system YAML are immediately reflected in tool generation.

## YAML format
The file contains a list of view definitions. Each definition creates two endpoints: `/mcp/{view}/tools/list` and `/mcp/{view}/jsonrpc`.

Allowed filter keys map directly to tool fields and annotations:
- `source`: one of `system`, `workflow` (matches tool source)
- `provider`: matches `annotations.provider` or `metadata.provider`
- `instance`: matches `annotations.instance` or `metadata.instance`
- `system`: matches `metadata.system`
- `object_type`: matches `metadata.object_type`
- `action`: matches `metadata.action`
- `name_prefix`: string prefix to match the final tool name
- `tags_include`: array; tool must include at least one of these tags
- `tags_exclude`: array; tool must not include any of these tags

Example:
```yaml
- name: "entra"
  path_prefix: "/entra"
  filters:
    provider: ["entra"]
    tags_include: ["directory"]

- name: "systems"
  path_prefix: "/systems"
  filters:
    system: ["svc"]

- name: "workflows"
  path_prefix: "/workflows"
  filters:
    source: ["workflow"]
```

Notes:
- `path_prefix` must be a single segment under `/mcp`, e.g., `/entra`, `/workflows`.
- Health tools (`system.health`, `system_health`) are always included for connectivity checks.
- Duplicate `path_prefix` values are not allowed; resolve conflicts in your YAML.

## Endpoints
Once configured, each view is available under:
- REST discovery: `GET /mcp/{view}/tools/list`
- JSON-RPC: `POST /mcp/{view}/jsonrpc` with methods `tools/list`, `tools/invoke` (or `tools/call`)

Behavior within a view:
- `tools/list` only returns tools that match the view filters (health tools always included)
- `tools/invoke` only executes tools present in that view. Invoking a tool outside the view returns JSON-RPC error `-32601` (not found in this view)
- Pagination parameters (`limit`, `cursor`) apply per view; health tools are prepended and excluded from page counts.

### Fallback views and hot‑reload
- If `mcp_virtual_servers.yaml` is missing or a requested view isn’t defined, fallback views are synthesized:
  - `workflows` with `filters: { source: ["workflow"] }` and `include_router: false`.
  - Provider‑based views (e.g., `entra`, `ldap`, `auth0`) with `filters: { provider: [<provider>] }` and `include_router: true`.
- When an unknown view is requested, the service reloads the views index and logs structured events. If still unknown, it attempts fallback derivation.
- After reload, `ConfigLoader.invalidate_caches()` is called to ensure the generator sees fresh system/workflow state.

### Structured logging
- Discovery emits JSON logs (keys shown for filtering):
  - `mcp_views_candidate_paths` – base dir and candidate locations scanned
  - `mcp_views_file_loaded` – path and count of loaded views
  - `mcp_views_file_not_found` – hint to create the file or set env
  - `mcp_view_fallback_created` – name and filters of the synthesized view
  - `mcp_unknown_view` – a request referenced a non‑existent view

## Pagination
Both REST and JSON-RPC `tools/list` support pagination via `limit` and `cursor`:
- Sorting: tools are sorted by final `name` ascending
- Health tools are prepended and are not part of pagination calculations
- `limit`: maximum number of tools per page (integer). If omitted, default is `MCP_MAX_TOOLS` or 80
- `cursor`: base64 URL-safe encoded last tool name from the previous page
- Response field `nextCursor` is present when more items are available; pass it back as `cursor` to continue

Env controls:
- `MCP_MAX_TOOLS`: default global page size if `limit` is not provided (default `80`)
- `MCP_MAX_TOOLS_PER_PAGE`: maximum per-page cap regardless of requested `limit` (optional)
- `MCP_VIRTUAL_SERVERS_FILE`: override views file path
- `MCP_ENABLE_ROUTER`: include optional short‑name router tools in views that set `include_router: true`
- `MCP_DUPLICATE_POLICY`: duplicate name handling (`fail|keep_first|keep_last|drop`)
- `MCP_TOOL_NAME_CAP`: cap for generated tool names to satisfy client UI limits

### Examples (direct to CRUDService)

REST discovery (first page):
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://<crud-host>/mcp/systems/tools/list?limit=50"
```

JSON-RPC discovery (with pagination):
```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  https://<crud-host>/mcp/systems/jsonrpc \
  -d '{
    "jsonrpc":"2.0",
    "id":"1",
    "method":"tools/list",
    "params": {"limit": 50, "cursor": null}
  }'
```

Invoke a tool within the view:
```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  https://<crud-host>/mcp/systems/jsonrpc \
  -d '{
    "jsonrpc":"2.0",
    "id":"2",
    "method":"tools/invoke",
    "params": {"name": "<tool_name>", "arguments": {"k": "v"}}
  }'
```

## Via BFF (recommended)
Matching proxy routes are available on the BFF:
- `GET /api/crud/mcp/{view}/tools/list` → CRUD `/mcp/{view}/tools/list`
- `POST /api/crud/mcp/{view}/jsonrpc` → CRUD `/mcp/{view}/jsonrpc`
- `GET /api/crud/mcp/{view}/jsonrpc` (SSE bridge for streamable-http clients, proxied to upstream POST)

Security notes:
- MCP paths are bearer-token only at the BFF; CSRF and DPoP are exempted for `PREFIX:/api/crud/mcp`
- Required scopes on CRUDService: `mcp.tools.discovery` (list), `mcp.tools.invoke` (invoke)

## Router tools (optional)
If you want a collapsed surface across provider/instance variants, enable:
- `MCP_ENABLE_ROUTER=true` (aggregated router tools will be included in discovery)

## Operational notes
- Views are resolved at application import time; restart the CRUDService to reload the views file
- Tool names follow the selected naming strategy and may be namespaced; use discovery results to obtain the exact name to invoke


