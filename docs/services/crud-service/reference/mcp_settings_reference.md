---
title: MCP Settings Reference (Orchestration Service)
---

Use this as the single source of truth for MCP settings in Orchestration Service. Link here from how‑tos and marketing pages instead of repeating variables.

## Contents
- [MCP endpoints](#mcp-endpoints)
- [Loopback MCP](#loopback-mcp)
- [Security & governance](#security-governance)
- [Observability](#observability)

## MCP endpoints

| Setting | Env var | Notes |
|---|---|---|
| Enable MCP | CRUD_MCP_ENABLED | Toggle MCP surface |
| Base path | CRUD_MCP_BASE_PATH | Default `/mcp` |
| Discovery path | CRUD_MCP_DISCOVERY_PATH | `/tools/list`, `/tools/search` |
| JSON‑RPC path | CRUD_MCP_JSONRPC_PATH | `/jsonrpc` |

## Loopback MCP

| Setting | Env var | Notes |
|---|---|---|
| Enable loopback | CRUD_MCP_LOOPBACK_ENABLED | Generate tools from ServiceConfigs |
| Views (virtual servers) | CRUD_MCP_VIEWS | Comma‑sep view names for scoped catalogs |
| View base | CRUD_MCP_VIEW_BASE | Base path for views (e.g., `/mcp/{view}`) |
| Pagination size | CRUD_MCP_PAGE_SIZE | Page size for list/search |

## Security and governance {#security-governance}

| Setting | Env var | Notes |
|---|---|---|
| Scope gate | CRUD_MCP_SCOPE_GATE | Enforce allow‑listed scopes per tenant |
| PDP gating | CRUD_MCP_PDP_ENABLED | Pre‑gate discovery/invoke via PDP |
| Tool registry integration | CRUD_MCP_TOOL_REGISTRY | Pull pins for attestation |

## Observability

| Setting | Env var | Notes |
|---|---|---|
| Logs | CRUD_LOG_LEVEL | Level for MCP components |
| OTEL exporter | OTLP_ENDPOINT | Export traces (if enabled) |

See also
- MCP API reference: `./mcp_api_reference.md`
- Loopback how‑to: `./mcp_loopback_howto.md`
- Security & governance: `./mcp_security_governance.md`
- KPI/Metrics: `./kpis_metrics.md`
