---
title: Traefik ForwardAuth with the BFF (Verified)
---

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

Testing (from QA guide)

```bash
curl http://localhost:8000/auth/forward  # 401/403 unauthenticated
```


