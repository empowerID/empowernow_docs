## Opt‑in MCP annotations for systems and workflows

Publish selected commands and workflows as MCP tools with minimal `mcp` blocks in your YAML. Avoid schema duplication—input schemas are derived from existing definitions.

### Principles
- Opt‑in only: add `mcp.enabled: true` to publish
- No schema duplication: inputs derived from `required_params` or workflow `inputs`
- Short, stable names with deterministic compacting when needed
- Cap publication to keep client catalogues small

### Command example (Entra account get by id)
```yaml
object_types:
  account:
    commands:
      get_user_by_id:
        endpoint: "/users/{{ params.SystemIdentifier }}"
        method: GET
        mcp:
          enabled: true
          name: "entra.account.get_by_id"
          description: "Get a user by ID"
          annotations:
            tags: ["read","directory","account"]
          resource:
            uriTemplate: "https://api.ocg.labs.empowernow.ai/users/{SystemIdentifier}"
            name: "User by ID"
            description: "HTTP view of the user"
            mimeType: "application/json"
```

### Workflow example (view user)
```yaml
name: "av_entraid_ocg_view_user"
description: >
  View Entra user details.
mcp:
  enabled: true
  name: "wf.entraid.user.view"
  description: "View an Entra user by ID"
  annotations:
    tags: ["workflow","read","entra"]
  resource:
    uriTemplate: "https://graph.microsoft.com/v1.0/users/{SystemIdentifier}"
    name: "User by ID (workflow)"
    mimeType: "application/json"
inputs:
  type: object
  required: ["SystemIdentifier"]
  properties:
    SystemIdentifier: { type: string, description: "Entra user id" }
```

### Naming and identity
- Add per‑system `mcpInstance` to label provider/instance/env and drive namespacing
- System tools → `provider.instance.base`; workflows → `workflow.<name>`

### Limits
- `MCP_MAX_TOOLS` – hard cap
- `MCP_LOOPBACK_ONLY_HEALTH=true` – publish only health tool (debug)

### Verify
1) List tools via BFF `/api/crud/mcp/tools/list`
2) Call health via JSON‑RPC `tools/call` with `{ name: "system.health", arguments: { verbose: true } }`
3) Invoke your new tool with required params


