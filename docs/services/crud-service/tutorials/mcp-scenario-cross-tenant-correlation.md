## Tutorial – Cross‑tenant correlation (Entra ↔ Auth0)

Correlate a user across Entra ID and Auth0 using deterministic tool names.

### Steps
1) Entra user (by id)
```bash
USER_ID=00000000-0000-0000-0000-000000000000
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"31","method":"tools/call","params":{"name":"entra.cont.account.get_by_id","arguments":{"SystemIdentifier":"'"$USER_ID"'"}}}' \
  https://<bff-host>/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | jq '{id: .SystemIdentifier, upn: .UserPrincipalName}'
```

2) Auth0 user (same identifier)
```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"32","method":"tools/call","params":{"name":"auth0.core.account.get_by_id","arguments":{"SystemIdentifier":"'"$USER_ID"'"}}}' \
  https://<bff-host>/api/crud/mcp/jsonrpc | jq -r '.result.content[0].text' | jq '{id: .user_id, email: .email}'
```

### Tips
- Use the namespaced surface to avoid schema ambiguity across providers
- Enrich results into a shared profile record downstream


