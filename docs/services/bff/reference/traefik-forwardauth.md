---
title: Traefik ForwardAuth with the BFF (Verified)
---

What this is

- Traefik ForwardAuth lets the proxy ask an external HTTP endpoint whether to allow a request. In our setup, Traefik calls the BFF at `/auth/forward` (alias of `/auth/verify`).
- If the BFF returns 200, Traefik forwards the original request to the target service and injects auth context headers (for example `Authorization`, `X-Session-ID`). If the BFF returns 401, Traefik denies the request at the edge.
- We enable ForwardAuth only for service hosts that must be protected at the edge (for example `pdp.ocg...`, Traefik dashboard). For same-origin SPA API calls to the BFF (`automate/authn/authz.ocg... → /api/**`), ForwardAuth is intentionally disabled; the BFF performs auth and returns CORS-friendly JSON errors.

Diagram

```mermaid
flowchart LR
  subgraph Client
    B[Browser / Service Client]
  end

  subgraph Edge[Traefik]
    R[Router (e.g., pdp-protected)]
    FA[Middleware: bff-forwardauth]
    SH[Security Headers]
    RL[Rate Limit]
  end

  subgraph BFF
    V[/GET /auth/forward\n(alias of /auth/verify)/]
  end

  subgraph Backend
    S[Protected Service (e.g., PDP)]
  end

  B --> R
  R --> SH
  R --> RL
  R -->|ForwardAuth| FA --> V
  V -->|200 + authResponseHeaders\n(Authorization, X-Session-ID, ...)| R
  V -->|401 Unauthorized| R
  R -->|Allow| S
  R -->|Deny 401| B

  %% SPA same-origin note (no ForwardAuth)
  classDef note fill:#fff,stroke:#bbb,color:#555;
  N1[[SPA hosts automate/authn/authz: /api/** → BFF directly\nForwardAuth disabled; BFF authenticates and returns JSON 401]]:::note
  N1 --- R
```

Endpoints and aliases (verified)

- BFF exposes `/auth/verify` and alias `/auth/forward` (see `ms_bff_spike/ms_bff/src/main.py` and `ms_bff_spike/ms_bff/src/api/v1/endpoints/auth.py`). Tests and configs reference both.

Traefik middleware (as in `CRUDService/traefik/dynamic.yml`)

```yaml
# ForwardAuth Middleware Configuration (dynamic.yml)
http:
  middlewares:
    bff-forwardauth:
      forwardAuth:
        address: "http://bff_app:8000/auth/forward"  # alias of /auth/verify in BFF
        trustForwardHeader: true
        authResponseHeaders:
          - "Authorization"      # JWT for backend services
          - "X-User-ID"          # User context
          - "X-Session-ID"       # Session reference
          - "X-Auth-Time"        # Auth timestamp
          - "X-User-Email"       # Optional
          - "X-User-Name"        # Optional
        authRequestHeaders:
          - "Cookie"
          - "X-Forwarded-For"
          - "X-Real-IP"
          - "User-Agent"
          - "Accept"
          - "Origin"
          - "Referer"
          - "Host"
```

Routers (selected, from `dynamic.yml`)

```yaml
http:
  routers:
    bff-public:
      rule: "Host(`api.ocg.labs.empowernow.ai`) && (PathPrefix(`/auth/login`) || PathPrefix(`/auth/callback`) || PathPrefix(`/auth/forward`) || PathPrefix(`/auth/csrf`) || PathPrefix(`/health`))"
      service: bff-service
      middlewares: [security-headers, rate-limit]

    bff-protected:
      rule: "Host(`api.ocg.labs.empowernow.ai`) && !PathPrefix(`/auth/login`) && !PathPrefix(`/auth/callback`) && !PathPrefix(`/auth/forward`) && !PathPrefix(`/auth/csrf`) && !PathPrefix(`/health`)"
      service: bff-service
      middlewares: [security-headers, rate-limit]
      # ForwardAuth intentionally disabled here; BFF returns CORS-enabled 401 JSON for SPA flows

    pdp-protected:
      rule: "Host(`pdp.ocg.labs.empowernow.ai`)"
      service: pdp-service
      middlewares: [bff-forwardauth, security-headers, rate-limit]

    traefik-dashboard:
      rule: "Host(`traefik.ocg.labs.empowernow.ai`) && (PathPrefix(`/api`) || PathPrefix(`/dashboard`))"
      service: api@internal
      middlewares: [bff-forwardauth, security-headers]

    spa-auth:
      rule: "(Host(`automate.ocg.labs.empowernow.ai`) || Host(`authn.ocg.labs.empowernow.ai`) || Host(`authz.ocg.labs.empowernow.ai`)) && PathPrefix(`/auth/`)"
      service: bff-service
      middlewares: [security-headers, rate-limit]

    spa-api:
      rule: "(Host(`automate.ocg.labs.empowernow.ai`) || Host(`authn.ocg.labs.empowernow.ai`) || Host(`authz.ocg.labs.empowernow.ai`)) && PathPrefix(`/api/`)"
      service: bff-service
      middlewares: [security-headers, rate-limit]
      # ForwardAuth disabled for same-origin SPA pattern
```

Behavior

- Where ForwardAuth is enabled (e.g., PDP and dashboard), Traefik calls `/auth/forward`; BFF validates session and returns 200 with headers (including `Authorization`) or 401.
- For SPA same-origin `/api/**` routes, ForwardAuth is intentionally disabled and BFF performs auth, returning CORS-enabled 401 JSON when unauthenticated.

SPA PDP calls (AuthZEN) via preserved paths

- On SPA hosts, PDP calls use preserved paths (`/access/v1/evaluation(s)`) and still route to the BFF (ForwardAuth disabled on SPA hosts). The BFF proxies to `pdp_service` with `preserve_path: true` per `routes.yaml`.
- The `pdp-protected` router with ForwardAuth is for direct access to the PDP host (e.g., non-SPA clients), not for SPA same-origin calls.

Where it’s configured (source of truth)

- `CRUDService/traefik/dynamic.yml`: defines `middlewares.bff-forwardauth.forwardAuth.address` and sets `authResponseHeaders`/`authRequestHeaders`. Routers like `pdp-protected` and `traefik-dashboard` attach this middleware.
- `CRUDService/docker-compose-authzen4.yml`: Traefik service labels apply `bff-forwardauth@file` to the dashboard; BFF router labels route SPA hosts `/api/**` and `/auth/**` without ForwardAuth.
- `ServiceConfigs/BFF/config/routes.yaml`: the BFF’s own upstream proxy map; unrelated to ForwardAuth itself but explains what `/api/**` the BFF will handle after authentication.

Testing (from QA guide)

```bash
curl http://localhost:8000/auth/forward  # 401/403 unauthenticated
```


