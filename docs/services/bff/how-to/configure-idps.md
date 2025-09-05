---
title: Configure IdPs (idps.yaml)
---

What this file is

- `ServiceConfigs/BFF/config/idps.yaml` defines Identity Providers and audiences the BFF trusts for bearer token validation and server‑side OAuth operations.
- Each entry pairs an `issuer` with a specific `audience` so the BFF can validate and normalize tokens from multiple clients/services, even if they share the same issuer.

What authentication the BFF supports

- Session (for SPAs): OAuth2 Authorization Code with PKCE (+ PAR). Optional DPoP and enterprise mTLS per env flags. Tokens stay server‑side; BFF issues an HttpOnly session cookie and enforces CSRF.
- Bearer (for services/APIs): Requests present `Authorization: Bearer <token>`. The BFF validates against configured IdPs (primarily via introspection) and normalizes roles/permissions via `claims_mapping`.
- ForwardAuth at edge: Traefik calls BFF `/auth/verify` (`/auth/forward`) to gate requests for selected hosts. See Traefik ForwardAuth reference.

File structure (fields)

- `name`: logical name used in logs/telemetry.
- `provider`: canonical alias for identity/ARNs. Use the same alias for IdP entries that share an issuer but differ by audience. If omitted, identity falls back to `name`.
- `issuer`: OIDC issuer URL.
- `audience`: expected `aud` for tokens in this context.
- `jwks_url`: JWKS for signature keys (used when signature verification is enabled).
- `introspection_url`: OAuth2 introspection endpoint the BFF calls to verify bearer tokens.
- `token_url`: OAuth2 token endpoint (used by BFF server‑side flows like code exchange or client credentials).
- `client_id`, `client_secret`: client credentials for introspection/token calls. You can reference env with `${VAR}`.
- `enable_token_exchange`: whether BFF may use OAuth token exchange for certain flows.
- `api_key`: optional key for IdPs that require it.
- `claims_mapping`:
  - `roles`: where to read roles (e.g., `roles`, `groups`, or Keycloak `resource_access` client roles).
  - `permissions`: where to read permissions; supports `format: space_delimited` for `scope`.

Example

```yaml
idps:
  - name: empowernow
    provider: empowernow
    issuer: https://idp.ocg.labs.empowernow.ai/api/oidc
    audience: https://idp.ocg.labs.empowernow.ai/api/admin
    jwks_url: https://idp.ocg.labs.empowernow.ai/api/oidc/jwks
    introspection_url: http://idp-app:8002/api/oidc/introspect
    token_url: https://idp.ocg.labs.empowernow.ai/api/oidc/token
    client_id: service-client
    client_secret: ${IDP_CLIENT_SECRET}
    enable_token_exchange: false
    claims_mapping:
      roles:
        - source: roles
        - source: groups
      permissions:
        - source: scope
          format: space_delimited
        - source: permissions

  # Same issuer, different audience (CRUD)
  - name: empowernow-crud
    provider: empowernow
    issuer: https://idp.ocg.labs.empowernow.ai/api/oidc
    audience: https://crud-service:8000
    jwks_url: https://idp.ocg.labs.empowernow.ai/api/oidc/jwks
    introspection_url: http://idp-app:8002/api/oidc/introspect
    token_url: https://idp.ocg.labs.empowernow.ai/api/oidc/token
    client_id: service-client
    client_secret: ${IDP_CLIENT_SECRET}
    claims_mapping:
      roles:
        - source: roles
        - source: groups
      permissions:
        - source: scope
          format: space_delimited
```

Flow (bearer path)

```mermaid
sequenceDiagram
  autonumber
  participant Client
  participant BFF
  participant IdP
  Client->>BFF: GET /api/... Authorization: Bearer <jwt>
  BFF->>BFF: Decode iss, aud; select IdP entry by issuer+audience
  BFF->>IdP: POST introspect (with client_id/secret)
  IdP-->>BFF: { active: true, scope, roles... }
  BFF->>BFF: Map claims → roles/permissions per claims_mapping
  BFF-->>Client: 200 JSON (or 401/403)
```

Environment and secrets

- You can reference environment variables for secrets (e.g., `client_secret: ${IDP_CLIENT_SECRET}`); these are resolved on load.
- In compose, prefer Docker secrets or env‑files and mount `ServiceConfigs/BFF/config` as read‑only.

Testing and verification

- Session flow: use your SPA and confirm login/callback works; BFF issues `bff_session` and CSRF cookie.
- Bearer flow: call any route marked `auth: bearer` in `routes.yaml` with `Authorization: Bearer <token>` and expect 200/401 accordingly. See routes reference to mark routes as bearer‑protected.

ARNs (identity propagation)

- The BFF represents unique identities as ARNs to standardize attribution and auditing, and may emit `X-Original-User` downstream when available.
- Provider selection prefers the IdP entry `provider` field, falling back to `name`. This stabilizes ARNs across audiences of the same issuer, e.g., `auth:account:empowernow:{sub}` for both admin and CRUD audiences.
- Learn more: Authentication — Unique Identity and ARNs, and Security Model — Headers contract (`X-Original-User`).

See also

- Explanation → Authentication Options and Flow
- Explanation → Security Model
- Reference → routes.yaml Reference
- Reference → Traefik ForwardAuth


