---
title: Admin Quickstart — Bring up the BFF
---

Goal: verify a working BFF stack in one pass.

Checklist

1) Start stack (compose or k8s)
   - Traefik reachable; BFF running; IdP, Redis healthy

2) Health checks
   - `curl -f http://localhost:8000/health`
   - `curl -f http://localhost:8080/ping`

3) Same‑origin SPA flow
   - Visit SPA host; call `/api/**` → 401 JSON (+ CORS in dev)
   - Go to `/auth/login` → redirect to IdP → `/auth/callback` → cookie set
   - Repeat `/api/**` → 200 JSON

4) ForwardAuth (if enabled)
   - `curl -i https://api.ocg.../auth/forward` → 401 unauthenticated
   - With session cookie → 200 and auth headers

5) PDP mapping sanity
   - Confirm your endpoint appears in `pdp.yaml:endpoint_map` and allows the action

If any step fails, see Runbooks and QA Test Execution.


