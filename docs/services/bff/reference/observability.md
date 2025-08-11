---
title: Observability (Metrics, Tracing, Health)
---

Prometheus metrics

- Endpoint: `GET /metrics` (text exposition) – exported from `prometheus_client`.
- Built‑in HTTP metrics: `http_requests_total{method,endpoint,status}`, `http_request_duration_seconds{...}`.
- Authentication/session metrics: `bff_active_sessions_total`, `bff_sessions_created_total`, `bff_sessions_destroyed_total{reason}`, `bff_verify_duration_seconds{status}`, `bff_oauth_flow_duration_seconds{flow_type}`, `bff_session_binding_failures_total{reason}`.
- Token workflow: `bff_token_refresh_success_total{user_id}`, `bff_token_refresh_failed_total{reason}`, `bff_token_refresh_total{service,status}`, `bff_token_exchange_total{grant_type,status}`, `bff_token_validation_total{token_type,status}`, `bff_token_expiry_total{service}`.
- PDP: `bff_authz_requests_total{resource,action,decision}`, `bff_authz_latency_seconds{resource}`.
- Dependencies: `bff_redis_operations_total{operation,status}`, `bff_redis_latency_seconds{operation}`, `bff_idp_requests_total{endpoint,status}`, `bff_idp_latency_seconds{endpoint}`, `bff_kafka_messages_total{topic,status}`, `circuit_breaker_status{service}`, `circuit_breaks_total{service}`.
- Security: `bff_csrf_violations_total{reason}`, `bff_rate_limit_violations_total{client_id}`, `bff_security_events_total{event_type,severity}`.
- Background: `bff_background_tasks_total{task_type,status}`, `bff_background_task_duration_seconds{task_type}`.
- Public SPA metrics ingestion: `POST /api/v1/metrics` increments `bff_public_metrics_total{event}`; payload is validated and PII/secret keys are rejected.

OpenTelemetry (tracing and metrics)

- Module: `observability/telemetry.py`.
- Enable via env: `TELEMETRY_ENABLED=true` (default) and `OTLP_ENDPOINT` (e.g., `http://otel-collector:4317`).
- Tracing: FastAPI, httpx, and Redis auto‑instrumented; spans exported via OTLP gRPC with `service.name=bff-service`, `service.version` from `BFF_VERSION`, and `deployment.environment` from `ENVIRONMENT`.
- Custom OTEL metrics (exported via OTLP):
  - `bff_forwardauth_duration_ms` (histogram)
  - `bff_session_validation_duration_ms` (histogram)
  - `bff_auth_requests_total` (counter)
  - `bff_token_refresh_duration_ms` (histogram)
  - `bff_session_binding_failures_total` (counter)

Dashboards

- Prometheus → Grafana: use histogram quantiles and rate functions, e.g.:
  - P95 verify latency: `histogram_quantile(0.95, sum(rate(bff_verify_duration_seconds_bucket[5m])) by (le))`
  - OAuth flow error rate: `rate(bff_token_refresh_failed_total[5m])`
  - PDP allow/deny: `sum(rate(bff_authz_requests_total{decision="allow"}[5m])) by (resource) / sum(rate(bff_authz_requests_total[5m])) by (resource)`
- OTEL traces: visualize end‑to‑end auth flows (ForwardAuth → Redis → IdP → backend) in Jaeger/Tempo.

Health

- Health endpoint in BFF returns JSON with component checks (Redis, IdP) and HTTP 200/503 for readiness.

Configuration summary

- Prometheus scrape: add annotations or static job to scrape `:8000/metrics`.
- OTEL: set `OTLP_ENDPOINT`, `BFF_VERSION`, `ENVIRONMENT`, and ensure collector is reachable.


