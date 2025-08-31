## MCP FAQ

### What is Loopback MCP?
An in‑process MCP server inside CRUDService that exposes tools derived from your ServiceConfigs and serves them via REST and JSON‑RPC.

### How do I list tools?
Use `GET /mcp/tools/list` or JSON‑RPC `tools/list` via `/mcp/jsonrpc` (or the BFF proxy routes).

### How do I invoke tools?
Use JSON‑RPC `tools/invoke` or `tools/call` with `{ name, arguments }`.

### Why two health names?
`system.health` and `system_health` are both provided for client compatibility.

### Why namespaced names?
Different providers/instances require different schemas. Namespaced `provider.instance.base` avoids collisions and ambiguity; workflows use `workflow.<name>`.

### Can workflows run immediately?
By default they validate inputs and return an accepted stub. To start immediately in dev/test, set `MCP_LOOPBACK_WORKFLOW_DIRECT_INVOKE=true` in CRUDService.

### I get 403 errors
Your token is missing required scopes (`mcp.tools.discovery` for list, `mcp.tools.invoke` for invoke), or BFF session/auth is failing.

### The tool catalogue is empty
Confirm ServiceConfigs are mounted and valid; the ToolCatalogue refreshes after config mutations. Check `MCP_MAX_TOOLS` cap.

### My tool name is too long
Names are capped (≤50 for generation, ≤64 in catalogue). Over‑long names are compacted with a stable hash; the catalogue skips names >64.


