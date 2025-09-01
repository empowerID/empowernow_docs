## MCP Quickstart for CRUDService

This quickstart gets you listing and invoking Loopback MCP tools in minutes, via the BFF proxy.

### Prerequisites
- A Bearer token with scopes: `mcp.tools.discovery`, `mcp.tools.invoke`
- BFF URL: `https://<bff-host>`
- Content type: `application/json`

### Architecture (transport)
```mermaid
flowchart LR
  Cursor[Client / Agent / CLI] -- JSON-RPC (HTTP) --> BFF[/api/crud/mcp/jsonrpc]
  BFF --> CRUD[/mcp/jsonrpc]
  CRUD --> GEN[Loopback Tool Generator]
  GEN --> CRUD
  CRUD --> BFF
  BFF --> Cursor
```

### 1) Discover tools (JSON‑RPC)
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/list"}' \
  https://<bff-host>/api/crud/mcp/jsonrpc | jq
```

Expected shape:
```json
{"jsonrpc":"2.0","id":"1","result":{"tools":[{"name":"system.health","description":"...","inputSchema":{...},"source":"system","metadata":{...}}]}}
```

View‑scoped discovery (for clients that cap visible tools):
```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"11","method":"tools/list","params":{"limit":50}}' \
  https://<bff-host>/api/crud/mcp/entra/jsonrpc | jq
```

### 2) Health check (invoke)
```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":"2","method":"tools/call",
    "params":{"name":"system.health","arguments":{"verbose":true}}
  }' \
  https://<bff-host>/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | jq
```

### 3) Invoke a system tool
Example (Entra user by ID):
```bash
USER_ID=00000000-0000-0000-0000-000000000000
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":"3","method":"tools/call",
    "params":{"name":"entra.cont.account.get_by_id","arguments":{"SystemIdentifier":"'"$USER_ID"'"}}
  }' \
  https://<bff-host>/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | jq
```

Invoke within a view:
```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":"3a","method":"tools/call",
    "params":{"name":"entra.cont.account.get_by_id","arguments":{"SystemIdentifier":"'"$USER_ID"'"}}
  }' \
  https://<bff-host>/api/crud/mcp/entra/jsonrpc | jq -r '.result.content[0].text' | jq
```

### 4) Invoke a workflow tool
```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":"4","method":"tools/call",
    "params":{"name":"wf.entraid.user.view","arguments":{"SystemIdentifier":"'"$USER_ID"'"}}
  }' \
  https://<bff-host>/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | jq
```

By default, workflows validate inputs and return an accepted stub. To start immediately (dev/test), set `MCP_LOOPBACK_WORKFLOW_DIRECT_INVOKE=true` on CRUDService.

### Cursor setup (optional)
Create or edit `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "crud-mcp": {
      "type": "streamable-http",
      "url": "https://<bff-host>/api/crud/mcp/jsonrpc",
      "headers": {
        "Authorization": "Bearer <ACCESS_TOKEN_WITH_scopes_mcp.tools.discovery_mcp.tools.invoke>",
        "Content-Type": "application/json"
      }
    }
  }
}
```

In Cursor, enable `crud-mcp`, then run: “List tools from crud-mcp.”

### Troubleshooting
- 403 on list or invoke → token missing required scope(s)
- Empty list → verify ServiceConfigs are mounted and readable
- No direct workflow start → set `MCP_LOOPBACK_WORKFLOW_DIRECT_INVOKE=true`
- CSRF errors → ensure you use the BFF MCP proxy URL
- Client catalogue caps (~50–60 tools) → use virtual views: `/api/crud/mcp/{view}/jsonrpc` with `limit`/`cursor`


