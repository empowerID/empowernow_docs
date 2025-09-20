---
title: PDP Cache Tuning (Allow/Deny TTLs)
---

Where to configure

- `ServiceConfigs/BFF/config/pdp.yaml` → `cache` section: `enabled`, `ttl_allow`, `ttl_deny`, `max_size`, `invalidate_on_policy_change`.
- See also: `../reference/settings-reference.md#pdp-integration` and anchors `#env-PDP_CACHE_DECISIONS`, `#env-PDP_CACHE_TTL`.

Runtime behavior (verified)

- The PDP client caches allow/deny decisions with separate TTLs; keys include subject, resource/id, and action (see `ms_bff_spike/ms_bff/src/services/pdp_client.py`).

Guidance

- Use longer TTL for allow; shorter for deny to reduce false negatives.
- Set `invalidate_on_policy_change: true` in environments where PDP can signal invalidation.


