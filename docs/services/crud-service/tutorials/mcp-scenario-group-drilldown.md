## Tutorial – Group drill‑down

View group details then fetch members.

### Steps
1) Group details (Entra)
```bash
GROUP_ID=00000000-0000-0000-0000-000000000000
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"41","method":"tools/call","params":{"name":"entra.cont.group.get_by_id","arguments":{"SystemIdentifier":"'"$GROUP_ID"'"}}}' \
  https://<bff-host>/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | jq '{id: .SystemIdentifier, name: .Name, desc: .Description}'
```

2) Members (example, if provided by your system config)
```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"42","method":"tools/call","params":{"name":"entra.cont.group.list_members","arguments":{"SystemIdentifier":"'"$GROUP_ID"'"}}}' \
  https://<bff-host>/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | jq '.[0:20]'
```

### Notes
- The exact member listing tool name depends on your system YAML


