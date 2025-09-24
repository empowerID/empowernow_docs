# Rate Limiting & Circuit Breaker Playbook

## Symptoms
- 429s on introspection or provider calls
- Circuit open events in metrics/logs

## Tunables
- IdP introspection token bucket (per caller/per token)
- BFF client-side token bucket and breaker thresholds

## Actions
1. Confirm if provider vs IdP limit
2. If IdP: raise limits temporarily or stagger traffic; check cache hit rate
3. If breaker open: investigate root cause (DB/Redis/IdP health), then close breaker
4. Communicate user impact and expected recovery

## Metrics to watch
- PAT introspect total, rate-limited, circuit-open
- Cache hit ratio; proxy latency; upstream error rates

## References
- `ms_bff_spike/ms_bff/src/services/pat_service.py`
- `IdP/docs/PAT_Introspection_Hardening.md`
