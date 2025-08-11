---
title: Configure PDP (pdp.yaml)
---

Location

- `ServiceConfigs/BFF/config/pdp.yaml`

Sections

- `connection`: `base_url`, `client_id`, `client_secret`, `token_url`, `timeout`, `verify_ssl`
- `endpoints`: `evaluation`, `batch`, `search_actions`
- `retry`: `max_retries`, `backoff_factor`, `max_timeout`, `retry_status_codes[]`
- `cache`: `enabled`, `ttl_allow`, `ttl_deny`, `max_size`, `invalidate_on_policy_change`
- `metrics`: `enabled`, `include_timing`, `include_cache_stats`, `detailed_decision_metrics`
- `circuit_breaker`: `enabled`, `failure_threshold`, `reset_timeout`, `min_requests`
- `endpoint_map`: path/method → resource/action/id_from/props (supports `$.field` extraction)

Tips

- Start with a small set of routes and expand; use canonical CRUD prefixes and preserved AuthZEN paths.
- Cache TTLs: set shorter TTL for deny decisions to reduce false negatives.


