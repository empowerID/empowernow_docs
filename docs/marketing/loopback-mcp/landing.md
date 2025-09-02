## Loopback MCP for CRUDService

Turn your system and workflow definitions into a secure, agent‑ready tool catalogue—no extra infrastructure required.

### Why Loopback MCP
- Single source of truth: tools generated from your ServiceConfigs
- Zero extra processes: in‑process MCP under `/mcp` endpoints
- Deterministic and scalable: stable names, caps, and collision safety
- Secure by design: scope‑gated discovery/invoke, BFF session protection
- Agent and UI ready: JSON‑RPC 2.0, merged catalogue, Visual Designer integration

### How it works
```mermaid
flowchart LR
  A[ServiceConfigs] --> G[Loopback Tool Generator]
  G --> CRUD[(CRUDService)]
  CRUD -->|/mcp/tools/list| D[Discovery]
  CRUD -->|/mcp/jsonrpc (tools/call)| I[Invocation]
  BFF[EmpowerNow BFF] -->|/api/crud/mcp/*| CRUD
  UI[Visual Designer] -->|/api/crud/tools/* (merged)| BFF
  EXT[External Agents] -->|JSON-RPC| BFF
```

### Key benefits
- Faster delivery: ship tools as soon as YAML is updated
- Safer operations: governance via scopes and PDP
- Better UX: consistent input schemas and titles for large catalogues
- Future‑proof: namespaced identity across providers and instances

### New: Virtual MCP Servers (fit client catalog limits)
Some MCP clients only display ~50–60 tools per server. Virtual MCP Servers let you publish scoped catalogs on separate paths (e.g., `/mcp/entra`, `/mcp/workflows`) with pagination—so agents and UIs stay fast without losing breadth.

### Get started
- Quickstart: `../../services/crud-service/how-to/mcp-quickstart.md`
- API Reference: `../../services/crud-service/reference/mcp_api_reference.md`
- Security & Governance: `../../services/crud-service/reference/mcp_security_governance.md`

### Talk to us
Ready to enable Loopback MCP in your environment? Contact the team to plan an adoption path and success metrics.


