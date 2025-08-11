---
title: Configuration Map
---

- Endpoints (BFF): `/auth/login`, `/auth/callback`, `/auth/verify` (alias `/auth/forward`), `/auth/logout`
- Env vars (selection):
  - `BFF_ALLOWED_REDIRECT_HOSTS`
  - `BFF_COOKIE_DOMAIN`
  - `OIDC_SCOPES`
  - `BFF_DYNAMIC_CALLBACK`, `BFF_DEFAULT_HOST`, `BFF_DEFAULT_SCHEME`
- Files:
  - `routes.yaml` (dynamic route/auth requirements)
  - `idps.yaml` (issuer, audience, JWKS)
- Traefik ForwardAuth (key fields):
  - `address: http://bff:8000/auth/forward`
  - `trustForwardHeader: true`
  - `authResponseHeaders: ["X-User-ID", "X-Session-ID", "X-Auth-Time"]` (plus `Authorization` when used)
  - `authRequestHeaders: ["Cookie", "User-Agent", "X-Forwarded-For"]`

