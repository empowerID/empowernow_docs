## Announcing Loopback MCP for CRUDService

Today we’re introducing Loopback MCP—a built‑in Model Context Protocol server inside CRUDService that publishes a secure, deterministic tool catalogue straight from your ServiceConfigs. No extra processes, no duplicated schemas.

### Highlights
- Tools from your YAML: systems and workflows turn into MCP tools automatically
- Secure operations: scope‑gated discovery/invoke, PDP/BFF compatible
- Agent & UI ready: JSON‑RPC 2.0, Visual Designer Tool Picker, merged catalogue
- Deterministic at scale: namespaced identities, caps, collision safety
 - New: Virtual MCP Servers for scoped catalogs (solve client limits ~50–60 tools)

### What you can do
- Discover tools via REST or JSON‑RPC and invoke them from Cursor or your own agents
- Use workflows as tools for human‑friendly inputs and multi‑step automation
- Search, filter, and select from large catalogues in the Visual Designer

### Get started
- Quickstart: `../../services/crud-service/how-to/mcp-quickstart.md`
- API Reference: `../../services/crud-service/reference/mcp_api_reference.md`
- BFF proxy routing: `../../services/bff/devops/mcp_proxy_routing.md`

### Learn more
- Deep dive: `./deep-dive.md`
- Release notes: `../../services/crud-service/reference/releases/loopback_mcp_1_0.md`


