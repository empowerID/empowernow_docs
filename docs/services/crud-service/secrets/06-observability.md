---
title: Observability
description: Audits, metrics, and traces for secrets flows
---

Auditing

- Kafka topics: `crud.secrets`, `crud.secrets.audit`
- Records include `resource_ref` HMAC (non‑leaky) when `TENANT_SALT` set
 - Access controls: restrict topics to audit processors; retention policy documented

Metrics

- Prometheus counters/histograms for decisions, provider calls, errors
 - Example metrics table:
   - `secrets_decisions_total{effect}` — count of PDP decisions
   - `provider_request_latency_seconds{provider,op}` — histogram
   - `secrets_errors_total{code}` — error counter

Traces

- OTel spans across PEP → PDP → provider; correlation IDs in logs and events

Dashboards and alerts (Admin)

- Provide dashboard JSON and alert thresholds (p95 latency, error rate > 1%)

QA generation

- Use dev SSE and API to synthesize events; verify trace stitching via `trace_id`


