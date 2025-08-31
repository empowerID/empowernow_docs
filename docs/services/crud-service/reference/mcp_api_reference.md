## MCP API Reference (CRUDService)

### Authentication and scopes
- Include `Authorization: Bearer <token>`
- Discovery requires scope: `mcp.tools.discovery`
- Invocation requires scope: `mcp.tools.invoke`

---

### REST: GET /mcp/tools/list
Lists all available tools.

Request
```
GET /mcp/tools/list
Authorization: Bearer <token>
```

Response (shape)
```json
{
  "tools": [
    {
      "name": "entra.cont.account.get_by_id",
      "description": "...",
      "inputSchema": { "type": "object", ... },
      "source": "system|workflow",
      "metadata": { "provider": "entra", "instance": "cont", "env": "..." },
      "annotations": { ... },
      "title": "optional UI title"
    }
  ]
}
```

---

### JSON‑RPC 2.0: POST /mcp/jsonrpc
```
POST /mcp/jsonrpc
Authorization: Bearer <token>
Content-Type: application/json
```

Methods
- `tools/list` → `{ "jsonrpc": "2.0", "id": "1", "result": { "tools": [...] } }`
- `tools/invoke` (alias `tools/call`) → executes a tool

tools/list example
```json
{"jsonrpc":"2.0","id":"1","method":"tools/list"}
```

tools/invoke example (system)
```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "tools/invoke",
  "params": {
    "name": "entra.cont.account.get_by_id",
    "arguments": { "SystemIdentifier": "00000000-0000-0000-0000-000000000000" }
  }
}
```

tools/invoke example (workflow)
```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "method": "tools/invoke",
  "params": {
    "name": "wf.entraid.user.view",
    "arguments": { "SystemIdentifier": "00000000-0000-0000-0000-000000000000" }
  }
}
```

Invoke result shape (text content)
```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "result": {
    "content": [ { "type": "text", "text": "{...}" } ]
  }
}
```

Errors
- Missing scope → HTTP 403 or JSON‑RPC error `-32001`
- Unknown method → `-32601`
- Validation errors → JSON‑RPC error with details in `data`

---

### Field semantics
- `name` – deterministic tool identity. System: `provider.instance.base`. Workflow: `workflow.<name>`.
- `inputSchema` – JSON Schema for tool inputs, derived from YAML or permissive.
- `source` – `system` or `workflow`.
- `metadata` – optional allow‑listed metadata (`provider`, `instance`, `env`).
- `annotations` – optional UI/search hints (tags, titles).

---

### Transport through BFF
- Use `https://<bff-host>/api/crud/mcp/jsonrpc` for JSON‑RPC and `.../mcp/tools/list` for REST.
- BFF enforces session auth; CRUDService enforces scopes.


