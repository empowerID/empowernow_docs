### MCP opt-in annotations for CRUDService systems and workflows

This guide shows how to expose selected commands and workflows as MCP Tools with a tiny `mcp` block, without duplicating schemas. It also shows how to advertise read-only GET endpoints as MCP Resources via a simple `resource` sub-block.

Key principles
- Minimal annotations only when you want a command/workflow to be published
- No schema duplication: inputSchema is derived from your existing YAML (required_params, templated path variables, and Jinja `params.*` usage)
  - For workflows, inputSchema is taken from the workflow's `inputs` object when present; otherwise a permissive object is used.
- Short names: the generator enforces a ≤50 character tool name with stable hash suffix when needed
- Publish cap: set `MCP_MAX_TOOLS` (default 80) to avoid huge catalogs
  - Health tool is always listed as both `system.health` and `system_health` for client compatibility

MCP block fields
- enabled: true|false (required to publish)
- name: short, stable tool name (optional; a compact fallback is derived)
- description: overrides the command/workflow description (optional)
- annotations: arbitrary metadata (e.g., tags)
- resource: optional block to publish an MCP Resource or Resource Template for GET-style reads
  - uriTemplate: template with variables (e.g., `.../users/{SystemIdentifier}`)
  - or uri: fixed URI
  - name, description, mimeType: resource metadata

What the server derives automatically
- inputSchema: built from `required_params`, path placeholders in `endpoint`, and all `params.*` references found in the command. All properties default to `string`, and the schema allows additionalProperties to remain permissive.
- description: from `mcp.description` or the command/workflow `description`.
- name: from `mcp.name`, otherwise `<system>.<object>.<action>` compacted and capped to ≤50 chars.

Environment variables
- MCP_MAX_TOOLS: hard cap for number of published tools (default: 80)
- MCP_LOOPBACK_ONLY_HEALTH: set to `true` to publish only the built-in `system.health` tool

Examples using real command definitions

1) Entra: account.get_user_by_id (Tool + Resource Template)
Add this under `ServiceConfigs/CRUDService/config/system_types/azure_system.yaml`:

```yaml
object_types:
  account:
    commands:
      get_user_by_id:
        endpoint: "/users/{{ params.SystemIdentifier }}"
        method: GET
        # Publish as MCP Tool (opt-in)
        mcp:
          enabled: true
          name: "entra.account.get_by_id"
          description: "Get a user by ID"
          annotations:
            tags: ["read","directory","account"]
          # Also publish a Resource Template for HTTP views
          resource:
            uriTemplate: "https://api.ocg.labs.empowernow.ai/users/{SystemIdentifier}"
            name: "User by ID"
            description: "HTTP view of the user object"
            mimeType: "application/json"
```

2) Entra: group.get_group_by_id (Resource Template only)
```yaml
object_types:
  group:
    commands:
      get_group_by_id:
        endpoint: "/groups/{{ params.SystemIdentifier }}"
        method: GET
        mcp:
          enabled: true
          name: "entra.group.get_by_id"
          description: "Get a group by ID"
          annotations:
            tags: ["read","directory","group"]
          resource:
            uriTemplate: "https://api.ocg.labs.empowernow.ai/groups/{SystemIdentifier}"
            name: "Group by ID"
            description: "HTTP view of the group object"
            mimeType: "application/json"
```

3) Entra: device.get_device_by_id (Tool only)
```yaml
object_types:
  device:
    commands:
      get_device_by_id:
        endpoint: "/devices/{{ params.device_id }}"
        method: GET
        mcp:
          enabled: true
          name: "entra.device.get_by_id"
          description: "Get a device by ID"
          annotations:
            tags: ["read","device"]
```

4) Auth0: account.GetUserByID (Tool + Resource Template)
Add this under `ServiceConfigs/CRUDService/config/system_types/auth0.yaml`:

```yaml
object_types:
  account:
    commands:
      GetUserByID:
        endpoint: "/users/{{ params.SystemIdentifier }}"
        method: GET
        description: "Retrieve detailed account information for a specific user"
        mcp:
          enabled: true
          name: "auth0.account.get_by_id"
          description: "Get Auth0 user by ID"
          annotations:
            tags: ["read","auth0","account"]
          resource:
            uriTemplate: "https://dev-zfvv8yp5jcpjdmpf.us.auth0.com/api/v2/users/{SystemIdentifier}"
            name: "Auth0 User by ID"
            description: "HTTP view of the Auth0 user"
            mimeType: "application/json"
```

Workflows (opt-in)
- The workflow schema now allows a top-level `mcp` object. The generator uses `inputs` as the tool `inputSchema`.

1) Entra user view (published)
```yaml
name: "av_entraid_ocg_view_user"
description: >
  A workflow that retrieves account information for an EntraID account and displays all of its fields in a form.

# MCP opt-in
mcp:
  enabled: true
  name: "wf.entraid.user.view"
  description: "View an Entra user by ID"
  annotations:
    tags: ["workflow", "read", "entra"]
  resource:
    uriTemplate: "https://graph.microsoft.com/v1.0/users/{SystemIdentifier}"
    name: "User by ID (workflow)"
    description: "HTTP view of the user object"
    mimeType: "application/json"

inputs:
  type: object
  required: ["SystemIdentifier"]
  properties:
    SystemIdentifier: { type: string, description: "The unique identifier of the EntraID user" }
```

2) Entra group view (published)
```yaml
name: "av_entraid_ocg_view_group"
description: >
  A workflow that retrieves group information for an EntraID group and displays all of its fields in a form.

# MCP opt-in
mcp:
  enabled: true
  name: "wf.entraid.group.view"
  description: "View an Entra group by ID"
  annotations:
    tags: ["workflow", "read", "entra"]
  resource:
    uriTemplate: "https://graph.microsoft.com/v1.0/groups/{SystemIdentifier}"
    name: "Group by ID (workflow)"
    description: "HTTP view of the group object"
    mimeType: "application/json"

inputs:
  type: object
  required: ["SystemIdentifier"]
  properties:
    SystemIdentifier: { type: string, description: "The unique identifier of the EntraID group" }
```

How tools are listed
- REST discovery: `GET /mcp/tools/list` (BFF proxy: `GET /api/crud/mcp/tools/list`)
- JSON-RPC discovery: `POST /mcp/jsonrpc` with `{ "method": "tools/list" }` (BFF proxy: `POST /api/crud/mcp/jsonrpc`)
- The server always includes `system.health`; other tools appear only when `mcp.enabled: true`.

Notes
- Add `mcpInstance` to each system to label provider/instance (`provider`, `instance`, `instance_label`, `env`).
- Names are namespaced by default to avoid collisions across providers/instances. Fallback uses suffix `@system` when identity is missing.
- Only safe, read‑only operations should be exposed as MCP Resources; tools can represent any action.
- The workflow JSON schema allows an optional top‑level `mcp` block.
- Verify
- 1) List tools and confirm your tool appears
  - REST: `GET /mcp/tools/list` or JSON‑RPC `tools/list`
- 2) Call health via JSON‑RPC `tools/call` with `{ name: "system.health", arguments: { verbose: true } }` (or `system_health`).
- 3) Invoke one enabled Azure/Auth0 tool with required params.

Cursor quick test
```json
{
  "mcpServers": {
    "crud-mcp": {
      "type": "streamable-http",
      "url": "https://api.ocg.labs.empowernow.ai/api/crud/mcp/jsonrpc",
      "headers": {
        "Authorization": "Bearer <ACCESS_TOKEN_WITH_scopes_mcp.tools.discovery_mcp.tools.invoke>",
        "Content-Type": "application/json"
      }
    }
  }
}
```
In Cursor, enable `crud-mcp`, then ask: “Run the CRUD MCP health check.”
- Keep tool names stable across releases; if you must rename, consider leaving the old name enabled for one release with a deprecated tag in `annotations`.



---

## See also

- Opt‑in authors guide: `../how-to/mcp-opt-in-authors-guide.md`
- Tool Catalogue & Naming: `../explanation/mcp_tool_catalogue_naming.md`
- API Reference: `./mcp_api_reference.md`
- Tutorials: `./mcp_tool_recipes.md`