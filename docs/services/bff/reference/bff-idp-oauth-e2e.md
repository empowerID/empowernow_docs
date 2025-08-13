---
id: bff-idp-oauth-e2e
title: Backend-for-Frontend (BFF) + IdP OAuth – End‑to‑End Configuration and Matching Guide
sidebar_label: BFF + IdP OAuth (E2E)
---

Mental model refresher

- End-user identity: comes from the OIDC ID token (or UserInfo) after the BFF exchanges the authorization code; the BFF stores `user_id = id_token.sub` in the session.
- Backend tokens: obtained and held by the BFF for upstream calls (client-credential or token-exchange). Their `sub` is usually the OAuth client (e.g., `bff-server`) and is not the end-user.
- No browser token exposure: only cookies are visible to the SPA.

Use this as the single source for setup, onboarding, and troubleshooting. It explains how the BFF, IdP, and SPAs fit together for OAuth 2.0/OIDC with DCR, PKCE, PAR, JARM, DPoP, and how to safely switch token endpoint authentication methods.

## System overview

- BFF
  - Hosts `/auth/login`, `/auth/callback`, `/auth/session`, `/auth/logout` for SPAs
  - Redirects browser to IdP; exchanges authorization code; manages session cookies
  - Talks to IdP using PKCE, PAR, JARM; supports DPoP and `private_key_jwt`
- IdP
  - Provides OIDC endpoints (`/.well-known/openid-configuration`, `/authorize`, `/token`, …)
  - Accepts DCR; stores clients in `ServiceConfigs/IdP/config/clients.yaml`
  - Enforces `redirect_uris`, scopes, and `token_endpoint_auth_method`
- SPAs
  - Delegate OAuth to the BFF; receive only session cookies

See also: `services/bff/explanation/bff-visual-guide`, `services/bff/explanation/authentication`, `services/bff/explanation/golden-path`.

## Where configuration lives

- BFF runtime (compose): `CRUDService/docker-compose-authzen4.yml` (`bff` service env)
- BFF code: `ms_bff_spike/ms_bff/src/services/idp_client.py` (token exchange, PKCE/Redis)
- IdP DCR policy: `ServiceConfigs/IdP/config/dcr_config.yaml` (top-level `policy`, `client_profiles`)
- IdP client store: `ServiceConfigs/IdP/config/clients.yaml`

## Matching matrix (must align)

| BFF (compose env) | IdP DCR policy / client profile | IdP clients.yaml |
| --- | --- | --- |
| `AUTH_CLIENT_ID=bff-server` | DCR payload `client_id` | `client_id: bff-server` |
| `MS_BFF_TOKEN_AUTH_METHOD` = `private_key_jwt` or `client_secret_post|basic` | `client_profiles.code-flow-pkjwt.token_endpoint_auth_method: private_key_jwt` (or secret-based profile) | `token_endpoint_auth_method: private_key_jwt` (or `client_secret_*`) |
| `BFF_JWT_SIGNING_KEY` (PEM path) | DCR sends JWKS with `kid` matching PEM | `jwks.keys[].kid/alg/n/e` pairs with BFF private key |
| `DCR_REDIRECT_URIS` include `https://<host>/auth/callback` | Policy validates schemes/limits | `redirect_uris:` include exact host + `/auth/callback` |
| `OIDC_SCOPES` (space‑sep) | `policy.allowed_scopes` includes all requested | `scopes:` and `scope:` include the same set |
| `OIDC_AUTHORIZATION_URL` (public) | — | — |
| `OIDC_ISSUER`/`OIDC_TOKEN_URL` (internal acceptable) | — | — |

Tips:
- If `BFF_DYNAMIC_CALLBACK=true`, the BFF computes `https://<request-host>/auth/callback`. Every such host must be present in the client’s `redirect_uris` without a trailing slash.
- Internal service‑to‑service calls can use HTTP on the Docker network; browser‑facing redirects must be public HTTPS.

## Token endpoint authentication methods

### private_key_jwt (recommended; FAPI‑aligned)
- BFF signs `client_assertion` with its private key; IdP validates via client JWKS
- Requires: BFF PEM mounted (`BFF_JWT_SIGNING_KEY`), IdP client with JWKS and `private_key_jwt`
- Failure signature if misaligned: 401 `invalid_client` with messages like “client_assertion_type must be jwt-bearer” or signature/JWK mismatch

Short operational guidance

- Perform a one-time DCR with a fresh IAT to register the client (PKJWT + JWKS/JWKS URI).
- After success, stop providing `DCR_IAT` in the BFF environment; startup remains idempotent.
- Set the client’s `jwks_uri` to the BFF JWKS endpoint: `https://<your-bff-host>/.well-known/jwks.json`.
- Rotate the BFF signing key and publish both old and new keys in JWKS briefly; the IdP will re-fetch via `jwks_uri`. No DCR re-registration needed.

### client_secret_post/basic (simpler; not FAPI)
- BFF uses a shared secret via form body or Authorization header
- Requires: IdP client with `client_secret` or `client_secret_hash` and matching `token_endpoint_auth_method`
- Trade‑offs: easier but weaker; secret distribution/rotation burden

See how‑tos: `services/bff/how-to/register-bff-private-key-jwt`, `services/bff/how-to/switch-auth-methods`.

## Redirect URIs: exact matching

- Use `/auth/callback` consistently. Do not register `/callback` if BFF uses `/auth/callback`.
- Register each SPA host separately in `redirect_uris` (array; not a comma‑joined string).
- Common pitfalls: host typos, trailing slashes, mixing HTTP/HTTPS.

## PKCE and Redis

- `/auth/login`: BFF stores `code_verifier` in Redis keyed by `pkce:{state}`
- `/auth/callback` → `/token`: BFF retrieves and includes `code_verifier`
- Health: Redis reachable (e.g., `REDIS_URL=redis://shared_redis:6379/5`), state not expired

See how‑to: `services/bff/how-to/pkce-redis-health`.

## Failure signatures → causes → fixes

| Error signature | Likely cause | Fix |
| --- | --- | --- |
| 400 DCR `invalid_scope` | `policy.allowed_scopes` missing requested scope | Add scope in `dcr_config.yaml`, restart IdP, rerun DCR |
| 400 DCR `invalid_redirect_uri` | Mismatch of host/path (`/auth/callback`) or unregistered URI | Align `DCR_REDIRECT_URIS` and `clients.yaml.redirect_uris`, set `DCR_FORCE_REPLACE=true`, restart BFF |
| 401 `/token` `invalid_client` “client_assertion_type must be jwt-bearer” | BFF using secret while IdP expects PKJWT, or missing PEM/JWKS | Set `MS_BFF_TOKEN_AUTH_METHOD=private_key_jwt`, mount PEM, ensure matching JWKS in client |
| CAEP consumer “Unable to bootstrap from (‘localhost’, 9092)” | Kafka not configured for BFF | Set `KAFKA_BOOTSTRAP_SERVERS=kafka:9092` |

## Switching methods safely

1) IdP: Change client record or re‑DCR to desired `token_endpoint_auth_method`; for secrets, ensure `client_secret` or `client_secret_hash`
2) BFF: Set `MS_BFF_TOKEN_AUTH_METHOD`, provide `AUTH_CLIENT_SECRET` for secret modes or PEM for PKJWT
3) Restart BFF; verify `/token` success

Detailed steps: `services/bff/how-to/switch-auth-methods`.

## Minimal operational workflow

1) Prepare IdP policy (`dcr_config.yaml`) and restart IdP
2) Set BFF env for DCR and auth method in compose; ensure PEM mounted
3) Restart BFF only; confirm DCR 201 and healthy service
4) Attempt SPA login; verify token exchange and session
5) Remove `DCR_IAT` from the environment once registration is confirmed

## Visuals

Sequence (Authorization Code with PKCE/PAR via BFF):

```mermaid
sequenceDiagram
  autonumber
  participant SPA
  participant BFF
  participant IdP

  SPA->>BFF: GET /auth/login
  BFF->>BFF: Save code_verifier in Redis (pkce:{state})
  BFF-->>SPA: 302 to IdP /authorize (PAR, PKCE, JARM)
  SPA->>IdP: Follow redirect
  IdP-->>SPA: 302 to BFF /auth/callback (code/JARM)
  SPA->>BFF: GET /auth/callback?code=...
  BFF->>BFF: Load code_verifier from Redis
  BFF->>IdP: POST /token (code, code_verifier, client auth)
  IdP-->>BFF: 200 tokens
  BFF-->>SPA: Set session cookie; redirect to app
```

See also: `services/bff/explanation/bff-visual-guide` for detailed architecture.

## Pointers and references

- BFF env index: `services/bff/reference/environment-index`
- FAPI features: `services/bff/reference/fapi-support`
- DCR bootstrap: `services/bff/how-to/dcr-bootstrap`, `services/crud-service/how-to/bff-startup-dcr-iat`
- IdP policy and clients: `ServiceConfigs/IdP/config/dcr_config.yaml`, `ServiceConfigs/IdP/config/clients.yaml`




