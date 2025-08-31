## Loopback MCP – One‑pager

Problem
- Agents and UIs need stable, governed tools across heterogeneous systems

Solution
- Loopback MCP publishes tools directly from CRUDService configs via `/mcp` endpoints and JSON‑RPC—no extra processes

Benefits
- Deterministic and namespaced catalogue
- Secure by design (scopes, PDP/BFF)
- Visual Designer + SDK integration

Architecture
```mermaid
flowchart LR
  Config[ServiceConfigs] --> Gen[Loopback Tool Generator]
  Gen --> CRUD[(CRUDService)]
  CRUD --> BFF[/api/crud/mcp/*]
  BFF --> Clients[UIs / Agents]
  CRUD --> Catalogue[/tools/list\n/tools/search/]
```

Get started
- Quickstart: `../../services/crud-service/how-to/mcp-quickstart.md`
- API: `../../services/crud-service/reference/mcp_api_reference.md`


