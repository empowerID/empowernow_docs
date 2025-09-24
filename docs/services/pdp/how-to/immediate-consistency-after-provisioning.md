---
title: Immediate consistency after provisioning
description: Ensure token exchange and provisioning flows see new delegations immediately by bypassing/evicting caches and emitting CDC.
---

Goal
- Eliminate stale denies right after creating a delegation by updating the decision, evicting/bypassing caches, and emitting CDC.

Assumptions
- ProvisionInterceptor is enabled in the PDP.
- You have multi‑instance PDP with optional Redis for EPS L2.

Steps
1) Bypass Graph L1 for sensitive actions
   - Use action names like `token_exchange` or `act_on_behalf_of` or set `context.bypass_cache=true` (or `context.auto_provision=true`).
2) Auto‑provision via obligation
   - Policy emits `delegation` obligation with attributes: `delegator_id`, `delegate_id`, `jkt`, `capability`, `auto_provision=true`.
3) Return enriched decision
   - PDP includes `context.attributes.delegation = { id, status, provisioned, binding_valid }`.
4) Evict caches
   - PDP calls `evict_after_delegation(delegator_id, subject_id)` to evict EPS (subject‑wide) and Graph L1 (subject‑coarse).
5) Emit CDC
   - PDP publishes `delegation.add` with `subject=delegator_id` so all instances evict EPS.

Verify
- Repeat the token exchange; result should reflect the new delegation immediately.

Troubleshooting
- Deny persists: ensure bypass flag/action set; check PDP logs for provisioning and eviction; verify Redis L2 and CDC.
- Verify negative: confirm `service_id` and `jkt` parity or prefix‑delete delegation verify/capabilities caches.

See also
- Caching & layers: `../explanation/performance_caching.md`
- CDC & topics: `../reference/kafka-eventing.md#inbound-cdc-and-cache-invalidation`
- Flags: `../reference/settings-flags.md#caching-and-performance`


