---
id: metrics-and-reliability
title: NowConnect and LDAP connector reliability enhancements
description: "New NowConnect cloud metrics and LDAP connector idempotency to improve reliability, observability, and operations."
sidebar_label: Metrics and reliability
---

### Scope

- **Services**: `nowconnect-cloud`, `nowconnect-premise`
- **Client path**: LDAP over NowConnect tunnel (`addomain` → `openldap`)
- **Connector**: `CRUDService/src/connectors/ldap_connector.py`

## What changed

### NowConnect cloud observability

- Added Prometheus metrics in `nowconnect_cloud/metrics.py`:
  - `nowconnect_write_drain_seconds{connector,phase}`: histogram for socket write and drain latency.
    - **write**: time to enqueue bytes on socket
    - **drain**: time to flush to kernel (backpressure visibility)
  - `nowconnect_inbound_queue_size{connector}`: gauge of per‑session inbound queue size (agent→cloud)
  - `nowconnect_listener_errors_total{connector,type}`: counter for listener/session errors
    - `type=write | session | pdp`
  - Existing counters remain: `tcp_connections_total`, `tcp_bytes_total`, `FIN/RST`, PDP decisions, `connection_duration_seconds`.

- Instrumentation in `nowconnect_cloud/listeners.py`:
  - a2c path:
    - Records queue size (`q.qsize`) on each frame
    - Times write and drain and observes into histograms
    - Increments listener error counter on write failure
  - PDP checks:
    - On PDP error increments PDP error decision counter and listener error (`type=pdp`)
  - Session exception path increments listener error (`type=session`)

### LDAP connector idempotency

- In `update_group_members` for group membership changes:
  - Treats LDAP result **16 (noSuchAttribute)** on delete and **20 (typeOrValueExists)** on add as success; logs at info.
  - Reduces flakiness during high‑churn tests and retries (benign duplicates no longer fail the flow).

## Why it matters

- **Reliability**
  - Idempotent group membership updates prevent benign failures when tests or workflows retry/remove already‑removed members or re‑add existing members.
- **Observability**
  - Per‑write and per‑drain latency exposes backpressure and downstream slowness.
  - Queue size highlights burst pressure on agent→cloud delivery.
  - Explicit listener error counters (write/session/PDP) allow clean alerting without log parsing.

## How to use

- Metrics endpoint
  - Inside `nowconnect-cloud` container: `http://localhost:8765/metrics`
  - Prometheus scrape example:

```yaml
- job_name: 'nowconnect'
  static_configs:
    - targets: ['nowconnect-cloud:8765']
  metrics_path: /metrics
```

- Grafana panels (suggested)
  - Write/drain latency:
    - p50/p95 for `nowconnect_write_drain_seconds{phase="write"}`, `{phase="drain"}` by connector
  - Queue pressure:
    - `nowconnect_inbound_queue_size` by connector (gauge; use max over time)
  - Traffic:
    - `rate(nowconnect_tcp_bytes_total[1m]) by (direction,connector)`
    - `rate(nowconnect_tcp_connections_total[5m]) by (connector)`
  - Errors:
    - `increase(nowconnect_listener_errors_total[5m]) by (connector,type)`
    - `increase(nowconnect_pdp_decisions_total{result="error"}[5m]) by (connector)`

- Alerting (examples)
  - Backpressure: p95 write or drain > 100ms for 5m (connector=addomain)
  - Queue overrun early‑warning: `nowconnect_inbound_queue_size` > 75% of `queue_depth_per_cid` for 2m
  - Listener error spike: `increase(nowconnect_listener_errors_total[5m]) > threshold`
  - PDP decision errors: `increase(nowconnect_pdp_decisions_total{result="error"}[5m]) > 0`

## Runbooks

- Validate tunnel and metrics
  - Generate traffic (read‑only LDAP) via `nowconnect-cloud:389`
  - Check counters: `nowconnect_tcp_connections_total`, `nowconnect_tcp_bytes_total` increase; `nowconnect_write_drain_seconds` and queue size present; write/drain near 0–10ms on local env

- Investigate latency regressions
  - High drain latency → target or network backpressure
  - High write latency → CPU saturation in hub (consider more workers) or GIL contention
  - Growing queue size → agent or target slow; verify agent connectivity and OpenLDAP health

- Investigate errors
  - `listener_errors_total{type=session}` rising → inspect cloud logs for exceptions and stack traces
  - `{type=write}` rising → socket write failures; inspect Docker network and target service health
  - PDP errors → verify PDP URL, timeouts, and PDP service logs

## Developer guidance

- Where to extend metrics
  - `nowconnect_cloud/listeners.py`:
    - Add additional labels if you route multiple connectors
    - Consider measuring per‑frame size buckets if needed
  - Hub‑level metrics (`nowconnect_cloud/hub.py`) can expose per‑session counts if deeper visibility is required.

- Connector behavior
  - Idempotency currently scoped to LDAP group membership adds/deletes:
    - Codes handled: 16 (noSuchAttribute), 20 (typeOrValueExists)
  - Extend similar patterns to other modify paths where safe and expected.

## Compatibility and deployment

- Backward‑compatible: new metrics and idempotency do not change API surfaces.
- Requires rebuild/redeploy of `nowconnect-cloud` for metrics and `crud-service` for connector changes.
- No config changes required. Optional: expose cloud hub 8765/metrics externally via Traefik for Prometheus outside the Docker network.

## Success criteria (visibility)

- Grafana shows low, non‑zero write/drain histograms; queue size near zero at steady state.
- Listener error counters near zero; PDP errors absent on healthy systems.
- During perf tests: byte rates scale, latency p95 meets SLOs, no error spikes or sustained queue growth.

See also:

- `services/nowconnect/how-to/operational-validation-health`
- `services/crud-service/explanation/ldap-connector-idempotency`


