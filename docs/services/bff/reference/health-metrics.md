---
id: health-metrics
title: Health and metrics
sidebar_label: Health / Metrics
tags: [service:bff, type:reference, roles:devops]
---

Purpose: operator endpoints for liveness/readiness and Prometheus metrics.

- Code: `ms_bff_spike/ms_bff/src/metrics/__init__.py`, `ms_bff_spike/ms_bff/src/api/v1/health.py` (mounted in `api.v1.api`)

Endpoints
- GET `/api/v1/metrics` (Prometheus format)
- GET `/api/v1/health` (overall; includes Redis summary)
- GET `/api/v1/health/redis`
- GET `/api/v1/health/ready` (503 when Redis unhealthy)
- GET `/api/v1/health/live`

Examples
```bash
curl -s https://.../api/v1/metrics | head -n 20
curl -s https://.../api/v1/health | jq .
```

SLO hints
- p95 `/auth/verify` < 5ms; PDP p95 < 100ms; 5xx rate < 0.1%

See also: `../how-to/alerting-cookbook`, `../how-to/health-readiness`, `./observability`


