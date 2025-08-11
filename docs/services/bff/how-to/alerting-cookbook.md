---
title: Alerting Cookbook — Metrics and SLO Hints
---

Key signals (from metrics and logs)

- Auth flow: `bff_oauth_flow_duration_seconds`, `par_requests_total`, `bff_token_refresh_*`
- ForwardAuth: reject rate (401), time to 200; dashboard router protected
- PDP: client call success/error and latency (see PDP client structured logs)
- DPoP: `dpop_validation_failures_total`

Example Prometheus rules (pseudocode)

```yaml
groups:
- name: bff
  rules:
  - alert: HighAuth401Rate
    expr: sum(rate(http_requests_total{path=~"/api/.*",status="401"}[5m])) / sum(rate(http_requests_total{path=~"/api/.*"}[5m])) > 0.2
    for: 10m
  - alert: PDPHighLatency
    expr: histogram_quantile(0.95, sum by (le) (rate(pdp_client_request_duration_seconds_bucket[5m]))) > 0.5
    for: 15m
  - alert: DPoPValidationFailures
    expr: increase(dpop_validation_failures_total[10m]) > 10
```

SLO hints

- 95% of ForwardAuth checks < 10ms
- 95% of PDP decisions < 500ms
- Token refresh failure rate < 1%

Dashboards

- Auth successes/errors, ForwardAuth 401%, PDP latency, refresh success/fail, DPoP failures, cache hit/miss.


