---
id: register-bff-private-key-jwt
title: Register BFF with private_key_jwt (via DCR)
sidebar_label: Register BFF (PKJWT)
---

Goal: Register/update the `bff-server` client using the `code-flow-pkjwt` profile with JWKS and exact redirect URIs.

Short answer

- One-time DCR with a fresh IAT; then remove `DCR_IAT` going forward.
- `token_endpoint_auth_method: private_key_jwt` with `jwks_uri` pointing at the BFF JWKS endpoint: `https://<your-bff-host>/.well-known/jwks.json`.
- Let the BFF handle access-token auto-refresh; no extra config.
- For ongoing key rotation, update the BFF JWKS; no need to re-DCR.

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
  # Optional but recommended: explicitly set the client's jwks_uri to BFF JWKS
  # If your IdP supports jwks_uri in DCR payloads, it should be
  # https://<your-bff-host>/.well-known/jwks.json
```

3) Restart BFF and watch logs for `201 Created` and “Client registered: bff-server”
4) Verify `ServiceConfigs/IdP/config/clients.yaml` has:
   - `client_id: bff-server`
   - `token_endpoint_auth_method: private_key_jwt`
   - Either `jwks_uri: https://<your-bff-host>/.well-known/jwks.json` or inline `jwks.keys` with a `kid` matching your PEM
   - `redirect_uris:` entries for each host with `/auth/callback`

## Troubleshooting

- `invalid_scope`: add scope to `policy.allowed_scopes`; restart IdP
- `invalid_redirect_uri`: fix host/path; re‑DCR with `DCR_FORCE_REPLACE=true`
- `invalid_client` (jwt-bearer): align method and PEM/JWKS; ensure key pair matches

After success

- Remove `DCR_IAT` from the BFF environment. Keep DCR enabled; startup becomes a no-op unless metadata changes.

See also: `services/bff/reference/bff-idp-oauth-e2e` and `services/bff/how-to/switch-auth-methods`.




