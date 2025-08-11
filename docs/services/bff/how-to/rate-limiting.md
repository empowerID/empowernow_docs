---
title: Configure Rate Limiting (Traefik + BFF)
---

Rate limits are enforced at the edge via Traefik middlewares. The dynamic config in `CRUDService/traefik/dynamic.yml` defines a reusable `rate-limit` middleware.

Verified config (excerpt)

```yaml
http:
  middlewares:
    rate-limit:
      rateLimit:
        burst: 100
        period: 1m
        average: 30
```

Apply per router

```yaml
http:
  routers:
    spa-api:
      middlewares:
        - security-headers
        - rate-limit
```

Notes

- Always specify `average` with `period`, or the effective bucket can be zero under load.
- Keep auth endpoints (`/auth/**`) behind a different router if you need different limits.

Validation

- Load test a single route and verify 429 responses begin after the configured rate is exceeded.


