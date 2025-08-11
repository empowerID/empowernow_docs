---
title: legacy_services.yaml Reference
---

Purpose

Defines the legacy C# microservices the BFF can reach via the legacy proxy. DevOps maintains this file; SPAs call the proxy paths exposed by the BFF.

Relationship to the proxy

- SPA calls: `/api/v1/proxy/{service}/{path}`
- This file maps `{service}` to a base URL and sets timeouts/limits/caching.
- Errors such as 503 (circuit open) or 413 (body too large) are governed by these settings.

Sections

- legacy_services: per‑service base URLs (override with `LEGACY_SERVICE_<NAME>_URL`)
- legacy_service_timeouts: per‑service timeouts (override with `LEGACY_SERVICE_<NAME>_TIMEOUT`)
- circuit_breaker: `threshold`, `reset_time` (env overrides available)
- response_cache: `enabled`, `default_ttl`, `max_size`
- request_limits: `max_body_size`

Examples

- Register a service:
  ```yaml
  legacy_services:
    res-admin: "https://api.empoweriam.com/api"
  legacy_service_timeouts:
    res-admin: 30.0
  circuit_breaker:
    threshold: 5
    reset_time: 60
  response_cache:
    enabled: true
    default_ttl: 30
  request_limits:
    max_body_size: 10485760
  ```

- SPA call using the mapping above:
  ```ts
  await apiClient.get('/api/v1/proxy/res-admin/services/v1/resadmin/resources/people/getsearch', { params: { top: 25 } });
  ```

- Environment override (per env):
  ```bash
  LEGACY_SERVICE_RES_ADMIN_URL=https://staging.api.empoweriam.com/api
  LEGACY_SERVICE_RES_ADMIN_TIMEOUT=20
  ```

CB/cache notes
- Circuit opens after `threshold` consecutive failures; requests return 503 until `reset_time` elapses.
- GET 200 responses are cached (memory + Redis if available) up to `default_ttl` or `Cache-Control: max-age`.
- Non‑GET successes trigger targeted invalidation.

See also: `./legacy-proxy`, `../how-to/add-legacy-service`, `../how-to/tune-legacy-circuit-cache`.


