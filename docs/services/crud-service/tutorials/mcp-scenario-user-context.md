## Tutorial – Build a user context (manager, groups, devices)

Goal: given a user id (`SystemIdentifier`), fetch the user, their manager, their groups, and registered devices using Loopback MCP tools.

### Steps
1) Entra user by ID
```bash
USER_ID=00000000-0000-0000-0000-000000000000
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"21","method":"tools/call","params":{"name":"entra.cont.account.get_by_id","arguments":{"SystemIdentifier":"'"$USER_ID"'"}}}' \
  https://<bff-host>/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | tee /tmp/user.json | jq
```

2) Manager (Entra)
```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"22","method":"tools/call","params":{"name":"entra.cont.account.get_manager","arguments":{"SystemIdentifier":"'"$USER_ID"'"}}}' \
  https://<bff-host>/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | tee /tmp/manager.json | jq
```

3) Groups (Entra)
```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"23","method":"tools/call","params":{"name":"entra.cont.account.list_groups","arguments":{"SystemIdentifier":"'"$USER_ID"'"}}}' \
  https://<bff-host>/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | tee /tmp/groups.json | jq '.[0:10]'
```

4) Registered devices (Entra)
```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"24","method":"tools/call","params":{"name":"entra.cont.device.list_user_registered","arguments":{"SystemIdentifier":"'"$USER_ID"'"}}}' \
  https://<bff-host>/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | tee /tmp/devices.json | jq '.[0:10]'
```

### Notes
- Ensure the token has `mcp.tools.invoke`
- Use `jq` to extract fields for dashboards or enrichment scripts


