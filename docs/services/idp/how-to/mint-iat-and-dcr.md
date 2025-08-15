---
id: mint-iat-and-dcr
title: Mint an Initial Access Token (IAT) and register a client (DCR)
description: How to use an admin access token to mint an IAT and then perform OAuth Dynamic Client Registration for services like the BFF.
sidebar_label: Mint IAT and DCR
---

## When to use this

Use this flow when bootstrapping a new OAuth client (for example, `bff-server`). An admin access token mints a short‑lived Initial Access Token (IAT), which authorizes a one‑time or limited client registration via DCR.

## Step 1 — Mint an IAT (admin token required)

POST `https://idp.ocg.labs.empowernow.ai/api/admin/dcr/initial-access-tokens`

Body (JSON):

```json
{ "label": "ms-bff bootstrap", "expires_in": 3600, "max_uses": 10 }
```

Headers:

- Authorization: `Bearer <ADMIN_ACCESS_TOKEN>`
- Content-Type: `application/json`

PowerShell

```powershell
$adminToken = '<ADMIN_ACCESS_TOKEN>'
$body = @{ label='ms-bff bootstrap'; expires_in=3600; max_uses=10 } | ConvertTo-Json
$iatRes = Invoke-RestMethod -Method Post `
  -Uri 'https://idp.ocg.labs.empowernow.ai/api/admin/dcr/initial-access-tokens' `
  -Headers @{ Authorization = "Bearer $adminToken" } `
  -ContentType 'application/json' -Body $body
$iat = $iatRes.token
```

cURL

```bash
curl -sS -X POST 'https://idp.ocg.labs.empowernow.ai/api/admin/dcr/initial-access-tokens' \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" -H "Content-Type: application/json" \
  -d '{"label":"ms-bff bootstrap","expires_in":3600,"max_uses":10}'
```

## Step 2 — Register the client using the IAT (DCR)

POST `https://idp.ocg.labs.empowernow.ai/api/oidc/dcr/register`

Headers:

- Authorization: `Bearer <IAT_TOKEN>`
- Content-Type: `application/json`

Example payload for BFF (Private Key JWT):

```json
{
  "client_name": "bff-server",
  "token_endpoint_auth_method": "private_key_jwt",
  "grant_types": ["authorization_code"],
  "response_types": ["code"],
  "scope": "openid profile email offline_access admin.api application.all dcr.register",
  "redirect_uris": [
    "https://automate.ocg.labs.empowernow.ai/auth/callback",
    "https://authn.ocg.labs.empowernow.ai/auth/callback",
    "https://authz.ocg.labs.empowernow.ai/auth/callback"
  ]
}
```

PowerShell

```powershell
$client = @{ 
  client_name = 'bff-server'
  token_endpoint_auth_method = 'private_key_jwt'
  grant_types = @('authorization_code')
  response_types = @('code')
  scope = 'openid profile email offline_access admin.api application.all dcr.register'
  redirect_uris = @(
    'https://automate.ocg.labs.empowernow.ai/auth/callback',
    'https://authn.ocg.labs.empowernow.ai/auth/callback',
    'https://authz.ocg.labs.empowernow.ai/auth/callback'
  )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post `
  -Uri 'https://idp.ocg.labs.empowernow.ai/api/oidc/dcr/register' `
  -Headers @{ Authorization = "Bearer $iat" } `
  -ContentType 'application/json' -Body $client
```

cURL

```bash
curl -sS -X POST 'https://idp.ocg.labs.empowernow.ai/api/oidc/dcr/register' \
  -H "Authorization: Bearer <IAT_TOKEN>" -H "Content-Type: application/json" \
  -d '{ "client_name":"bff-server", "token_endpoint_auth_method":"private_key_jwt", "grant_types":["authorization_code"], "response_types":["code"], "scope":"openid profile email offline_access admin.api application.all dcr.register", "redirect_uris":["https://automate.ocg.labs.empowernow.ai/auth/callback"] }'
```

## Notes and troubleshooting

- IATs are short‑lived and limited‑use. Re‑mint if it expires or is exhausted.
- For BFF bootstrap, set the minted token as the `DCR_IAT` environment/config value.
- Ensure your IdP client has permissions to mint IATs (admin token context) and that your IdP allows DCR.
- If registration fails with `invalid_client_metadata`, validate `redirect_uris`, `grant_types`, and `token_endpoint_auth_method`.

See also:

- `services/bff/how-to/dcr-compose-wiring` (where to paste IAT in compose and restart order)
- `services/bff/how-to/dcr-bootstrap` (operational policy and flow details)


