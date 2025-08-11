---
title: Golden Path
---

Mini flow

```mermaid
sequenceDiagram
  autonumber
  participant SPA
  participant BFF
  participant IdP
  SPA->>BFF: GET /auth/login
  BFF-->>SPA: 302 → IdP /authorize (PKCE/PAR)
  SPA->>IdP: GET /authorize
  IdP-->>BFF: 302 → /auth/callback?code=...
  BFF->>IdP: POST /token (DPoP/mTLS if enabled)
  BFF-->>SPA: Set-Cookie bff_session
  BFF-->>SPA: 302 to /
  SPA->>BFF: GET /api/... (cookie + CSRF)
  BFF-->>SPA: 200 JSON
```

See also: `../how-to/spa-auth-flows`, `../how-to/spa-with-bff`

The “golden path” is our recommended, production‑grade way for SPAs to access backend APIs through the BFF. It optimizes security, performance, and developer experience:

- Security: tokens never reach the browser; Traefik or the BFF validates the session on every request
- Performance: most requests short‑circuit on a 1ms session lookup; only auth transitions hit the IdP
- Simplicity: SPAs call `/api/**` on the same origin; no token‑plumbing in the frontend

```mermaid
sequenceDiagram
  autonumber
  participant Browser as SPA
  participant Traefik as Traefik (Edge)
  participant BFF as BFF /auth/verify
  participant Redis as Redis
  participant IdP as IdP
  participant API as Backend API
  Note over Browser: SPA shell already loaded
  Browser->>Traefik: GET /api/... (same-origin)
  Traefik->>BFF: ForwardAuth /auth/verify (cookie?)
  BFF->>Redis: lookup session
  alt not found
    BFF-->>Traefik: 401
    Traefik-->>Browser: 401
    Browser->>Traefik: GET /auth/login?return_to=/api/...
    Traefik-->>Browser: 302 → BFF /auth/login
    BFF-->>Browser: 302 → IdP /authorize (PKCE/PAR)
    Browser->>IdP: GET /authorize + MFA
    IdP-->>Browser: 302 → /auth/callback?code=...
    Browser->>BFF: GET /auth/callback
    BFF->>Redis: store session (tokens, binding)
  else found
    BFF-->>Traefik: 200 + headers
    Traefik->>API: forward with Authorization
    API-->>Traefik: 200 JSON
    Traefik-->>Browser: 200 JSON
  end
```

Why this path is golden

- Least surprise for frontend teams (same‑origin APIs, cookie auth)
- Edge filters most unauthenticated traffic quickly; BFF handles OAuth and PDP authZ
- Works equally well on localhost (CORS allowlist) and prod (same‑origin)

Where it’s configured

- Traefik dynamic config: ForwardAuth middleware and SPA routers
- BFF config: `routes.yaml` (canonical `/api/...`), `pdp.yaml` (authZ mapping), `idps.yaml` (IdP audiences)
