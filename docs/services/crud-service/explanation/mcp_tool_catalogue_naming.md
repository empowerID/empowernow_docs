## MCP Tool Catalogue & Naming

Loopback MCP publishes tools with deterministic names and schemas, and merges them with built‑ins and any configured external MCP endpoints.

### Naming strategy
- System tools: `provider.instance.base` (e.g., `entra.cont.account.get_by_id`, `ldap.av.account.get_by_dn`).
- Workflow tools: `workflow.<name>` (e.g., `wf.entraid.user.view`).
- Cap at 50 characters and append a stable hash suffix only when necessary.
- Pre‑cap and final collision checks fail fast (recommended policy: `MCP_DUPLICATE_POLICY=fail`).

Add per‑system identity via `mcpInstance` in system YAML:
```yaml
mcpInstance:
  provider: entra
  instance: cont
  instance_label: "Contoso Entra"
  env: prod
```

### Router surface (optional)
Publish short names with a `oneOf` input schema to represent multiple providers behind one conceptual tool. Disabled by default; keep invocation routing on namespaced names.

### Catalogue merge
```mermaid
flowchart LR
  A[config/tools.yaml<br/>(built-ins)] --> C[ToolCatalogue]
  B[Loopback MCP<br/>generated tools] --> C
  E[External MCP endpoints<br/>config/mcp_endpoints.yaml] --> C
  C --> F[/tools/list\n/tools/search/]
```

### Input schema derivation
- Commands: use explicit `input_schema` if provided; otherwise derive from `required_params` and optional hints; fallback to `{ "type": "object", "additionalProperties": true }`.
- Workflows: use top‑level `inputs` JSON Schema when present; otherwise the same permissive fallback applies.

### Limits and pagination
- Enforce hard cap with `MCP_MAX_TOOLS` to keep catalogs consumable by UIs/agents.
- Deterministic ordering and pagination remove jitter.

### Examples
- Entra account get by id → `entra.cont.account.get_by_id` (args: `SystemIdentifier`)
- Auth0 account get by id → `auth0.core.account.get_by_id` (args: `SystemIdentifier`)
- OpenLDAP account get by DN → `ldap.av.account.get_by_dn` (args: `DistinguishedName`)


