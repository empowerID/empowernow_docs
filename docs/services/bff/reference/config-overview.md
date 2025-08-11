---
title: Configuration Overview
---

Where configuration lives

- Primary files: `ServiceConfigs/BFF/config/*.yaml`
- Env overrides: process env (Docker/K8s/Compose) replace `${VAR}` and take precedence at runtime
- Secrets: use Docker/K8s secrets; mount as files; reference via file: pointers where supported

Load order

1) YAML defaults → 2) `${VAR}` expansion → 3) runtime env overrides

Recipes

- Dynamic callback
  - `BFF_DYNAMIC_CALLBACK=true`
  - `BFF_DEFAULT_HOST=api.<env>.empowernow.ai`, `BFF_DEFAULT_SCHEME=https`
  - Alternative (static): `BFF_DYNAMIC_CALLBACK=false` + `BFF_CALLBACK_URL=https://api.../auth/callback`

- Cookie/session
  - `BFF_COOKIE_DOMAIN=.ocg.labs.empowernow.ai`, `SESSION_LIFETIME=3600`
  - Single cookie: `bff_session` (HttpOnly, Secure, SameSite=Lax)

- Traefik ForwardAuth
  - Middleware address: `http://bff:8000/auth/forward` (alias of `/auth/verify`)
  - Request headers: `Cookie`, `User-Agent`, `X-Forwarded-For`
  - Response headers: `X-User-ID`, `X-Session-ID`, `X-Auth-Time` (and Authorization when used)

- SPA same‑origin model
  - SPA calls `/api/**` on its own host; BFF handles auth and returns 401 JSON when unauthenticated
  - Add dev origins in `CORS__ALLOW_ORIGINS` for local tools; production SPAs should be same‑origin


