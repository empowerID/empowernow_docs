---
title: Admin Quickstart
---

This guide is based on verified BFF code and configs. It shows the minimum steps to get login → callback → session check working.

## Prerequisites
- Set IdP issuer: `OIDC_ISSUER` (required)
- Choose callback mode:
  - Dynamic: `BFF_DYNAMIC_CALLBACK=true` + `BFF_DEFAULT_HOST` + optional `BFF_DEFAULT_SCHEME`
  - Static: `BFF_DYNAMIC_CALLBACK=false` + `BFF_CALLBACK_URL`
- Configure cookie domain: `BFF_COOKIE_DOMAIN` (e.g., `.ocg.labs.empowernow.ai`)
- Allowed absolute return_to hosts: `BFF_ALLOWED_REDIRECT_HOSTS`
- OAuth scopes: `OIDC_SCOPES`

## Verified endpoints
- `/auth/login`, `/auth/callback`
- `/auth/verify` (Traefik) and alias `/auth/forward`
- `/api/auth/session` (SPA session check)
- `/auth/logout`
- `/health`

## Golden-path (concise)
```mermaid
sequenceDiagram
  autonumber
  participant SPA
  participant Traefik
  participant BFF
  participant IdP
  participant Redis
  SPA->>Traefik: GET /api/... (same-origin)
  Traefik->>BFF: GET /auth/verify (cookie?)
  BFF->>Redis: Lookup bff_session
  alt missing
    BFF-->>Traefik: 401
    Traefik-->>SPA: 401
    SPA->>BFF: GET /auth/login
    BFF-->>SPA: 302 → IdP (PKCE)
    SPA->>IdP: Sign-in
    IdP-->>SPA: 302 → /auth/callback?code=...
    SPA->>BFF: GET /auth/callback
    BFF->>Redis: Store session
  else found
    BFF-->>Traefik: 200 + X-User-ID/X-Session-ID/X-Auth-Time
    Traefik-->>SPA: 200 JSON
  end
```

## Minimal configuration (examples)
- `OIDC_ISSUER=https://idp.ocg.labs.empowernow.ai/api/oidc`
- `BFF_DYNAMIC_CALLBACK=true`
- `BFF_DEFAULT_HOST=authn.ocg.labs.empowernow.ai`
- `BFF_DEFAULT_SCHEME=https`
- `BFF_COOKIE_DOMAIN=.ocg.labs.empowernow.ai`
- `BFF_ALLOWED_REDIRECT_HOSTS=authn.ocg.labs.empowernow.ai,authz.ocg.labs.empowernow.ai,automate.ocg.labs.empowernow.ai`
- `OIDC_SCOPES=openid profile email offline_access admin.api application.all`

## Validate
1) Health: `GET /health` → 200 JSON
2) CSRF cookie appears after a safe GET (middleware sets `_csrf_token`)
3) Login round-trip completes and sets `bff_session` (HttpOnly, Secure, SameSite=Lax, Domain configured)
4) `/api/auth/session` returns `{ authenticated: true, ... }` when logged in
