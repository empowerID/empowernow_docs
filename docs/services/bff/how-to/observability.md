---
title: Observability
---

Metrics (from code):
- `bff_active_sessions_total`
- `bff_token_refresh_success_total`
- `bff_token_refresh_failed_total`
- `bff_session_binding_failures_total`
- `traefik_forwardauth_rejected_total`
- `bff_oauth_flow_duration_seconds`

Prom scraping:
- Annotations on pod: `prometheus.io/scrape: true`, `prometheus.io/port: 8000`, `prometheus.io/path: /metrics`

Health:
- `GET /auth/health` used by liveness/readiness/startup probes

Logs:
- Structured security events (session created/invalidated; CSRF; token refresh)
