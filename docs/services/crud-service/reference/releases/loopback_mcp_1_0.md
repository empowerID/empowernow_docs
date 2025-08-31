## Loopback MCP in CRUDService – Release Notes 1.0

These notes capture the initial Loopback MCP capability and link to the production documentation.

### What’s included
- In‑process MCP server under `/mcp` with REST discovery and JSON‑RPC 2.0
- Scope‑gated access: `mcp.tools.discovery`, `mcp.tools.invoke`
- Deterministic tool generation from ServiceConfigs (systems + workflows)
- ToolCatalogue merge with built‑ins and optional external MCP endpoints
- BFF proxy routes for secure access from UIs/agents
- Structured logs with correlation IDs; OTEL optional

### Documentation
- Overview: See Explanation → MCP Overview (`../../explanation/mcp-overview.md`)
- Quickstart: See How‑To → MCP Quickstart (`../../how-to/mcp-quickstart.md`)
- API Reference: See Reference → MCP API (`../mcp_api_reference.md`)
- Security & Governance: See Reference → MCP Security (`../mcp_security_governance.md`)
- Tool Catalogue & Naming: See Explanation → Catalogue & Naming (`../../explanation/mcp_tool_catalogue_naming.md`)
- BFF proxy routing: See BFF DevOps guide (`../../../bff/devops/mcp_proxy_routing.md`)

### Scenarios that work now
- Discover tools via REST or JSON‑RPC through BFF
- Invoke system tools via `tools/invoke|tools/call` with schema validation
- Invoke workflow tools with argument validation; optional direct start in dev/test
- Visual Designer Tool Picker supports large catalogues with filters and dedupe

### Configuration checklist
- Ensure ServiceConfigs are mounted and `mcp.enabled: true` is set where needed
- Set `MCP_MAX_TOOLS` and `MCP_DUPLICATE_POLICY=fail`
- Add `mcpInstance` per system for namespacing and labels
- Optional: `MCP_LOOPBACK_WORKFLOW_DIRECT_INVOKE=true` for dev/test

### Troubleshooting
- 403 on list/invoke → check scopes
- Empty list → check configs, validation errors, or publish caps
- Direct workflow start missing → enable the env flag above


