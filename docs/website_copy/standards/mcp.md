# What is MCP (Model Context Protocol)?

MCP is an emerging pattern for agent-to-tool interactions that standardizes how agents discover, describe, and call tools with schemas.

## Why it matters
- Safer agent/tool execution via schema-based contracts
- Enables policy enforcement and audit at the agent boundary

## How it works (high-level)
- Agents discover tools and their schemas
- Requests/Responses conform to the declared schema
- Gateways can enforce schema pins and policy per tool call

## Key terms
- Tool schema, schema pins, plan contracts

## Common pitfalls
- Schema drift across versions; insufficient validation at the boundary

## Next steps
- ARIA MCP Gateway product: `website_copy/product_gateway.md`
- ARIA Shield: `services/bff/explanation/bff_gateway.md`
