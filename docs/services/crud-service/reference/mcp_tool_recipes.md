### CRUDService MCP tools – recipes and real-world scenarios

This page has been split into focused tutorials. See Tutorials:
- Build a user context: `../tutorials/mcp-scenario-user-context.md`
- Cross‑tenant correlation: `../tutorials/mcp-scenario-cross-tenant-correlation.md`
- Group drill‑down: `../tutorials/mcp-scenario-group-drilldown.md`

Core patterns and quick discovery remain here for convenience.

This guide shows how to trigger our MCP tools and compose them to accomplish end‑to‑end tasks. It uses the BFF MCP proxy (`/api/crud/mcp/jsonrpc`) and JSON‑RPC 2.0. You can run these with curl, Postman, or directly from Cursor (MCP client).

## Prerequisites
- Bearer token with scopes: `mcp.tools.discovery` and `mcp.tools.invoke`.
- BFF MCP URL: `https://api.ocg.labs.empowernow.ai/api/crud/mcp/jsonrpc`
- Content-Type: `application/json`

## Quick discovery
- List tools (JSON‑RPC):
```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/list"}' \
  https://api.ocg.labs.empowernow.ai/api/crud/mcp/jsonrpc | jq
```

## Core invoke pattern
- Use `tools/call` (alias for `tools/invoke`):
```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":"2","method":"tools/call",
    "params": {"name":"<TOOL_NAME>", "arguments": { /* tool args */ }}
  }' \
  https://api.ocg.labs.empowernow.ai/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | jq
```

## Tools enabled today (examples)
- Health: `system.health` (also available as `system_health`)
- Entra ID (Azure):
  - `entra.cont.account.get_by_id` (args: `SystemIdentifier`)
  - `entra.cont.group.get_by_id` (args: `SystemIdentifier`)
  - `entra.cont.device.get_by_id` (args: `device_id`)
  - `entra.cont.device.list_user_registered` (args: `SystemIdentifier`)
- Active Directory (on‑prem LDAP):
  - `ad.devdomain1.account.get_by_id` (args: `SystemIdentifier`)
  - `ad.devdomain1.group.get_by_id` (args: `SystemIdentifier`)
- Auth0:
  - `auth0.core.account.get_by_id` (args: `SystemIdentifier`)
- OpenLDAP:
  - `ldap.av.account.get_by_dn` (args: `DistinguishedName`)
  - `ldap.av.account.get_by_email` (args: `Email`)
- Workflows (graph):
  - `wf.entraid.user.view` (args: `SystemIdentifier`)
  - `wf.entraid.group.view` (args: `SystemIdentifier`)

## Simple checks
- Health
```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"10","method":"tools/call","params":{"name":"system.health","arguments":{"verbose":true}}}' \
  https://api.ocg.labs.empowernow.ai/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | jq
```

## Scenario 1 – Build a user context (manager, groups, devices)
Goal: given a user id (`SystemIdentifier`), fetch the user, their manager, their groups, and registered devices.

```bash
USER_ID=00000000-0000-0000-0000-000000000000

# 1) Entra user by ID
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"21","method":"tools/call","params":{"name":"entra.cont.account.get_by_id","arguments":{"SystemIdentifier":"'"$USER_ID"'"}}}' \
  https://api.ocg.labs.empowernow.ai/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | tee /tmp/user.json | jq

# 2) Manager (Entra)
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"22","method":"tools/call","params":{"name":"entra.cont.account.get_manager","arguments":{"SystemIdentifier":"'"$USER_ID"'"}}}' \
  https://api.ocg.labs.empowernow.ai/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | tee /tmp/manager.json | jq

# 3) Groups (Entra)
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"23","method":"tools/call","params":{"name":"entra.cont.account.list_groups","arguments":{"SystemIdentifier":"'"$USER_ID"'"}}}' \
  https://api.ocg.labs.empowernow.ai/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | tee /tmp/groups.json | jq '.[0:10]'

# 4) Registered devices (Entra)
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"24","method":"tools/call","params":{"name":"entra.cont.device.list_user_registered","arguments":{"SystemIdentifier":"'"$USER_ID"'"}}}' \
  https://api.ocg.labs.empowernow.ai/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | tee /tmp/devices.json | jq '.[0:10]'
```

## Scenario 2 – Cross‑tenant correlation (Azure AD ↔ Auth0)
Goal: fetch the Entra user and correlate with Auth0 by the same identifier.

```bash
USER_ID=00000000-0000-0000-0000-000000000000

# Entra user
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"31","method":"tools/call","params":{"name":"entra.cont.account.get_by_id","arguments":{"SystemIdentifier":"'"$USER_ID"'"}}}' \
  https://api.ocg.labs.empowernow.ai/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | jq '{id: .SystemIdentifier, upn: .UserPrincipalName}'

# Auth0 user (if same id is used)
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"32","method":"tools/call","params":{"name":"auth0.account.get_by_id","arguments":{"SystemIdentifier":"'"$USER_ID"'"}}}' \
  https://api.ocg.labs.empowernow.ai/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | jq '{id: .user_id, email: .email}'
```

## Scenario 3 – Group drill‑down
Goal: view group details then fetch its members (using list fragments where available).

```bash
GROUP_ID=00000000-0000-0000-0000-000000000000

# Group details (Entra)
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"41","method":"tools/call","params":{"name":"entra.cont.group.get_by_id","arguments":{"SystemIdentifier":"'"$GROUP_ID"'"}}}' \
  https://api.ocg.labs.empowernow.ai/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | jq '{id: .SystemIdentifier, name: .Name, desc: .Description}'
```

## Workflows as tools (human‑friendly)
Goal: use workflows that encapsulate multiple steps but expose a simple input schema.

```bash
# View user (workflow)
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"51","method":"tools/call","params":{"name":"wf.entraid.user.view","arguments":{"SystemIdentifier":"'"$USER_ID"'"}}}' \
  https://api.ocg.labs.empowernow.ai/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | jq

# View group (workflow)
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"52","method":"tools/call","params":{"name":"wf.entraid.group.view","arguments":{"SystemIdentifier":"'"$GROUP_ID"'"}}}' \
  https://api.ocg.labs.empowernow.ai/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | jq
```

## Cursor usage
In Cursor, once `crud-mcp` is configured, you can say:
- “List tools from crud-mcp.”
- “Run the CRUD MCP health check with verbose true.”
- “Given user <id>, fetch their groups and manager.”

Cursor will chain calls via `tools/list` and `tools/call` using the same endpoints above.


