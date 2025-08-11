---
title: pdp.yaml Reference
---

Connection

- base_url, client_id, client_secret, token_url, timeout, verify_ssl

Behavior

- retry: `max_retries`, `backoff_factor`, `max_timeout`, `retry_status_codes[]`
- cache: `enabled`, `ttl_allow`, `ttl_deny`, `max_size`, `invalidate_on_policy_change`
- metrics: `enabled`, `include_timing`, `include_cache_stats`, `detailed_decision_metrics`
- circuit_breaker: `enabled`, `failure_threshold`, `reset_timeout`, `min_requests`

Endpoint map

- Maps HTTP paths/methods to `resource`, `action`, optional `id_from` and `props` (JSONPath) for PDP context.


