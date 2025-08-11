---
id: register-bff-private-key-jwt
title: Register BFF with private_key_jwt (via DCR)
sidebar_label: Register BFF (PKJWT)
---

Goal: Register/update the `bff-server` client using the `code-flow-pkjwt` profile with JWKS and exact redirect URIs.

## Prereqs

- IdP `policy.allowed_scopes` covers BFF scopes (edit `ServiceConfigs/IdP/config/dcr_config.yaml`)
- BFF PEM available in the `bff-keys` volume
- DCR Initial Access Token (see `services/crud-service/how-to/bff-startup-dcr-iat`)

## Steps

1) Ensure IdP policy contains required scopes and `client_profiles.code-flow-pkjwt` is enabled; restart IdP
2) Set BFF env in `CRUDService/docker-compose-authzen4.yml` (service: bff):

```yaml
environment:
  AUTH_CLIENT_ID: bff-server
  MS_BFF_TOKEN_AUTH_METHOD: "private_key_jwt"
  BFF_JWT_SIGNING_KEY: /app/keys/fapi-adv-key-1.pem

  DCR_IAT: "<paste iat>"
  DCR_CLIENT_ID: bff-server
  DCR_CLIENT_PROFILE: code-flow-pkjwt
  DCR_SIGNING_KEY: /app/keys/fapi-adv-key-1.pem
  DCR_REDIRECT_URIS: https://automate.ocg.labs.empowernow.ai/auth/callback,https://authn.ocg.labs.empowernow.ai/auth/callback,https://authz.ocg.labs.empowernow.ai/auth/callback
  DCR_FORCE_REPLACE: "true"
```

3) Restart BFF and watch logs for `201 Created` and “Client registered: bff-server”
4) Verify `ServiceConfigs/IdP/config/clients.yaml` has:
   - `client_id: bff-server`
   - `token_endpoint_auth_method: private_key_jwt`
   - `jwks.keys` with a `kid` matching your PEM
   - `redirect_uris:` entries for each host with `/auth/callback`

## Troubleshooting

- `invalid_scope`: add scope to `policy.allowed_scopes`; restart IdP
- `invalid_redirect_uri`: fix host/path; re‑DCR with `DCR_FORCE_REPLACE=true`
- `invalid_client` (jwt-bearer): align method and PEM/JWKS; ensure key pair matches

See also: `services/bff/reference/bff-idp-oauth-e2e` and `services/bff/how-to/switch-auth-methods`.



