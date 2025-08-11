---
title: Authentication Options and Flow
sidebar_position: 2
---

What we support (verified)

- Browser SPAs use a secure session with a single HttpOnly cookie (`bff_session`).
- Service/API callers can use bearer tokens; the BFF validates via IdP introspection when configured.
- IdP configuration is externalized in `ServiceConfigs/BFF/config/idps.yaml` (issuer, audience, JWKS/introspection URLs, client credentials, claims mapping).

Two flows in one system

```mermaid
sequenceDiagram
  autonumber
  participant SPA
  participant Traefik
  participant BFF
  participant IdP
  Note over SPA: Session-based (cookie)
  SPA->>Traefik: GET /api/** (same-origin)
  Traefik->>BFF: /auth/verify
  BFF-->>Traefik: 200/401 + headers
  Note over SPA: 401 → navigate to /auth/login
  ...
  Note over IdP: login → callback → session in Redis
  
  Note over BFF: Bearer token path
  SPA->>BFF: GET /api/** Authorization: Bearer <jwt>
  BFF->>IdP: POST introspect (retry)
  IdP-->>BFF: { active: true, ..., scope, roles }
  BFF-->>SPA: 200 JSON
```

Where it’s implemented

- Bearer validation is in `utils/auth.py` (`get_current_user`): decodes issuer from JWT, loads `idps.yaml`, retries `introspect_token`, builds `EnhancedTokenClaims` with normalized roles/permissions.
- Unique identity is represented as `auth:{entity_type}:{idp}:{subject}` (see `utils/arn.py` and `UniqueIdentity` in `utils/auth.py`).

Key behaviors

- Session path: tokens never reach the browser; Traefik calls `/auth/verify` (alias `/auth/forward`) to gate requests; BFF sets/clears `bff_session` and issues CSRF token for state‑changing calls.
- Bearer path: `HTTPBearer` extracts the token; we do unverified decode to read `iss`, then introspection with Basic auth using IdP client credentials; we normalize roles/permissions via claims mapping.

Security notes

- Claims mapping supports sources from `roles`, `groups`, Keycloak `resource_access` client roles, and space‑delimited `scope`. See `claims_mapping` in `idps.yaml`.
- Retries/backoff for introspection use `tenacity` (transient errors won’t result in immediate 401s).


