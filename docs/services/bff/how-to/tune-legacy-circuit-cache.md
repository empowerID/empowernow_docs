---
id: tune-legacy-circuit-cache
title: Tune legacy proxy circuit breaker and cache
sidebar_label: Tune CB/cache
tags: [service:bff, type:how-to, roles:devops]
---

Goal: adjust circuit breaker and caching behavior for legacy proxy.

Config: `ServiceConfigs/BFF/config/legacy_services.yaml`
- `circuit_breaker.threshold`, `circuit_breaker.reset_time`
- `response_cache.enabled`, `default_ttl`, `max_size`
- `legacy_service_timeouts.{service}`

Procedure
1) Update the YAML values above and promote per SOP
2) Validate with traffic; monitor Prometheus:
   - `circuit_breaker_status{service="..."}`
   - `circuit_breaks_total{service="..."}`
   - `cache_hits_total`, `cache_misses_total`

Notes
- Non‑GET writes invalidate cache for affected paths automatically
- 413 indicates request body exceeds `request_limits.max_body_size`

See also: `../reference/legacy-proxy`, `./alerting-cookbook`


