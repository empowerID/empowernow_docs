# Observability & Dashboards

## Metrics dictionary (examples)
- BFF_PAT_INTROSPECT_TOTAL
- BFF_PAT_INTROSPECT_RATE_LIMIT_TOTAL
- BFF_PAT_INTROSPECT_CIRCUIT_OPEN_TOTAL
- Proxy latencies (per path/provider)
- Stream cancellations/settlements

## Dashboards
- PAT Health: introspect totals, rate-limit, circuit open, cache hit ratio
- Proxy SLOs: latency percentiles, error rates, streaming stats
- Top Spenders: by subject/agent/model

## Alerts
- Circuit open sustained > N seconds
- 5xx error rate > threshold
- Introspect 429s spike

## References
- BFF metrics: `ms_bff_spike/ms_bff/src/metrics/__init__.py`
