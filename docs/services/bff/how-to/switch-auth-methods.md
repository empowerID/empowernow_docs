---
id: switch-auth-methods
title: Switch token endpoint auth methods (PKJWT ↔ client_secret_*)
sidebar_label: Switch auth methods
---

This runbook switches the BFF client between `private_key_jwt` and `client_secret_post`/`client_secret_basic` safely.

## PKJWT → client_secret_post/basic

1) IdP: Update client to `token_endpoint_auth_method: client_secret_post` (or `client_secret_basic`) and set `client_secret` or `client_secret_hash` in `ServiceConfigs/IdP/config/clients.yaml` (or re‑register via DCR)
2) BFF: Set `MS_BFF_TOKEN_AUTH_METHOD` to the chosen method and set `AUTH_CLIENT_SECRET`; PEM can be removed/ignored
3) Restart BFF; verify `/token` 200 during login

## client_secret_* → PKJWT

1) IdP: Re‑register with `client_profiles.code-flow-pkjwt` via DCR, providing JWKS
2) BFF: Set `MS_BFF_TOKEN_AUTH_METHOD=private_key_jwt`; ensure `BFF_JWT_SIGNING_KEY` PEM is mounted
3) Restart BFF; verify `/token` 200 and correct JWKS `kid`

## Common pitfalls

- Changing BFF env without updating the IdP client (or vice versa) leads to 401 `invalid_client`
- Missing/incorrect JWKS `kid` vs PEM → signature mismatch
- Missing `client_secret` in clients.yaml when switching to secret methods

See also: `services/bff/reference/bff-idp-oauth-e2e` and `services/bff/how-to/register-bff-private-key-jwt`.



