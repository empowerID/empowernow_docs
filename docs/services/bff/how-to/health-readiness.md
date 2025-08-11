---
title: Health and Readiness Probes
---

Implementation (from architecture docs)

- `/health` endpoint returns component checks (Redis, IdP) and overall status with 200 or 503.
- Use as Kubernetes liveness/readiness probe; expose in Traefik `bff-service` health check.

Example probe (K8s)

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 30
readinessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 5
```

Graceful shutdown

- On shutdown, stop accepting new requests, allow inflight to complete, close Redis and HTTP clients.


