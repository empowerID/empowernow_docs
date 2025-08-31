## KPIs and instrumentation references

Track adoption and reliability of Loopback MCP.

### Suggested KPIs
- Tools published count and growth (by source: built‑in, loopback, external)
- Tools discovery and invoke success rates
- Median/95th percentile invoke latency
- Catalogue refresh time and errors
- Token scope failures (403 rates)
- UI Tool Picker search latency and selection rate

### Instrumentation hooks
- Structured logs: `mcp_tools_list_*`, `mcp_jsonrpc_*` with correlation IDs
- OTEL spans (optional): list and invoke durations with status


