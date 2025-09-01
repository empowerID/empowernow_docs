## Loopback MCP in CRUDService – Overview

Loopback MCP makes your CRUDService a first‑class Model Context Protocol server without running any extra processes. It exposes tools that are generated directly from your ServiceConfigs (systems + workflows) and serves them via REST and JSON‑RPC endpoints under `/mcp/*`. UIs, SDKs, and external agents can discover and invoke these tools securely through the BFF proxy.

### What you get
- Deterministic, namespaced tool catalogue generated from ServiceConfigs
- Single source of truth – no duplicate schemas or parallel MCP daemons
- REST discovery and JSON‑RPC 2.0 invocation
- Secure by design – scope‑gated discovery and invoke, compatible with PDP/BFF
- Designed for scale – stable names, collision checks, publish caps, observability

### Architecture
```mermaid
flowchart LR
  A[ServiceConfigs<br/>systems + workflows] --> G[Loopback Tool Generator]
  G -->|deterministic catalogue| CRUD[(CRUDService)]
  CRUD -->|GET /mcp/tools/list\nGET /mcp/{view}/tools/list| D[[REST]]
  CRUD -->|POST /mcp/jsonrpc\nPOST /mcp/{view}/jsonrpc| R[[JSON-RPC 2.0]]
  BFF[EmpowerNow BFF] -->|/api/crud/mcp/* proxy| CRUD
  UI[Visual Designer / SDK] -->|/api/crud/tools/* (merged catalogue)| BFF
  AG[External MCP Clients] -->|/api/crud/mcp/jsonrpc| BFF
```

### Key concepts
- Tool generation: Derived from system commands and workflows. Input schemas come from your YAML (`required_params`, `inputs`), with permissive fallbacks to avoid blocking publication.
- Naming: Stable, namespaced `provider.instance.base` for system tools (e.g., `entra.cont.account.get_by_id`), and `workflow.<name>` for workflows. Enforced ≤50 characters with deterministic hash suffix when needed.
- Transport: Use `GET /mcp/tools/list` for discovery or JSON‑RPC `tools/list`. Invoke tools via JSON‑RPC `tools/invoke` (alias `tools/call`).
- Security: Discovery requires `mcp.tools.discovery`; invocation requires `mcp.tools.invoke`. Same PDP/auth patterns as CRUDService.
- Catalogue merge: CRUDService `ToolCatalogue` merges built‑ins, loopback MCP, and any configured external MCP endpoints.

### When to use Loopback MCP
- You want agents and UIs to call system commands/workflows without custom adapters
- You need a consistent, searchable tool surface across providers/instances
- You need stability across releases (deterministic tool names and schemas)

### Quick links
- Quickstart: See How‑To → MCP Quickstart
- API reference: See Reference → MCP API
- Security & governance: See Reference → MCP Security & Governance
- Tool catalogue & naming: See Explanation → MCP Tool Catalogue & Naming
- Recipes & tutorials: See Tutorials → MCP Scenarios

### Supported endpoints (CRUDService)
- GET `/mcp/tools/list` – returns `{ tools: [...] }`
- GET `/mcp/{view}/tools/list` – view‑scoped discovery with pagination (`limit`, `cursor`)
- POST `/mcp/jsonrpc` – JSON‑RPC 2.0 (`tools/list`, `tools/invoke|tools/call`)
- POST `/mcp/{view}/jsonrpc` – JSON‑RPC constrained to a virtual view

### Supported BFF proxy routes
- GET `/api/crud/mcp/tools/list` → CRUD `/mcp/tools/list`
- POST `/api/crud/mcp/jsonrpc` → CRUD `/mcp/jsonrpc`

### Observability
- Structured logs with correlation IDs and durations for discovery and invoke
- OTEL optional; disabled by default in tests/local env via `OTEL_DISABLED=true`

### Limits and safeguards
- Tool name length constraints; deterministic collision handling
- Publication caps via `MCP_MAX_TOOLS`
- Duplicate policy via `MCP_DUPLICATE_POLICY` (fail‑fast recommended)
- Virtual server config via `MCP_VIRTUAL_SERVERS_FILE`; use views to fit client catalog caps (~50–60)


