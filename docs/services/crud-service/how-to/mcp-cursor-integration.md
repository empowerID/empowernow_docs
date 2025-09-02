## Cursor integration for Loopback MCP

Connect Cursor (or any MCP‑capable client) to CRUDService via the BFF using HTTP JSON‑RPC.

### Configure Cursor
Create or edit `~/.cursor/mcp.json` (Windows: `%USERPROFILE%\.cursor\mcp.json`):
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

For clients with catalog caps, add view‑scoped servers:
```json
{
  "mcpServers": {
    "crud-mcp-entra": {
      "type": "streamable-http",
      "url": "https://<bff-host>/api/crud/mcp/entra/jsonrpc",
      "headers": { "Authorization": "Bearer <TOKEN>", "Content-Type": "application/json" }
    },
    "crud-mcp-workflows": {
      "type": "streamable-http",
      "url": "https://<bff-host>/api/crud/mcp/workflows/jsonrpc",
      "headers": { "Authorization": "Bearer <TOKEN>", "Content-Type": "application/json" }
    }
  }
}
```

### Verify
Open the MCP panel in Cursor and enable `crud-mcp`, then ask:
- “List tools from crud-mcp.” → sends `tools/list`
- “Run the CRUD MCP health check with verbose true.” → sends `tools/call` to `system.health`

### Example commands
List tools:
```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/list"}' \
  https://<bff-host>/api/crud/mcp/jsonrpc | jq
```

Invoke a tool:
```bash
USER_ID=00000000-0000-0000-0000-000000000000
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"2","method":"tools/call","params":{"name":"entra.cont.account.get_by_id","arguments":{"SystemIdentifier":"'"$USER_ID"'"}}}' \
  https://<bff-host>/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | jq
```

Within a view:
```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"2","method":"tools/call","params":{"name":"entra.cont.account.get_by_id","arguments":{"SystemIdentifier":"'"$USER_ID"'"}}}' \
  https://<bff-host>/api/crud/mcp/entra/jsonrpc | jq -r '.result.content[0].text' | jq
```

### Scopes
- `mcp.tools.discovery` for listing
- `mcp.tools.invoke` for invoking

### Troubleshooting
- 403 responses → missing scopes on token
- CSRF errors → ensure URL points to the BFF proxy
- Empty catalogue → verify ServiceConfigs and catalogue refresh in CRUDService


