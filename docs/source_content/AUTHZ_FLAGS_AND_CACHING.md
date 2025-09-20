# Authorization flags, cache keys, staleness policy, and ops guidance

This document captures the operational knobs and cache conventions used by the PDP and PIP for EPS and Graph‑Eval modes.

## Feature flags and environment variables

- GRAPH_EVAL_ENABLED: true|false
  - Global gate for Graph‑Eval. If false, PDP evaluates via EPS only.
- EVALUATION_MODE: eps|graph
  - Default evaluation mode when GRAPH_EVAL_ENABLED is true and no per‑app override exists.
- GRAPH_EVAL_APPS: csv
  - Comma‑separated app ids that force Graph‑Eval when GRAPH_EVAL_ENABLED is true.
- PDP_L1_CACHE_ENABLED: true|false
  - Enables PDP in‑process L1 decision cache for Graph‑Eval results.
- PDP_L1_CACHE_TTL: seconds (default 10)
  - TTL for PDP L1 decision cache entries.
- REDIS_URL: redis://
  - When set, PDP will use Redis as L2 for `EpsCache` (L1 remains in‑process). Keys use the `authz` namespace prefix.
- PDP_STATE_DIR: filesystem path (default .state)
  - Base directory to store EPS Last‑Known‑Good (LKG) snapshots under `eps-lkg/`.

Notes:
- Per‑app overrides for evaluation mode are read from the settings config: `settings.evaluation_mode_per_app[app_id] ∈ {"eps","graph"}`. When present and GRAPH_EVAL_ENABLED=true, it takes priority over env defaults.
- Delegation decisions never use LKG; revocations (hard‑evict) disable LKG for affected principals/apps.

## Cache keys and namespaces

EpsCache (L1/L2):
- Key format: `eps:{subject_arn}:{application_id}`
- Namespace: when Redis is used, keys live under `authz:{original_key}` (via `CacheKeys` prefix).
- Value shape (JSON):
  - application_id, subject_arn, compiled, etag, graph_snapshot_id, provenance

Delegation verify cache (PIP):
- Key format: `delegation_verify:{delegator_id}:{delegate_id}:{service_id|default}:{jkt|no-jkt}`
- TTL: ≤ 60s recommended (short‑lived). JKT is included to bind results to key material.

Other indicative caches:
- roles, resource ancestry, etc. follow similar short TTLs (≤ 60s) and are invalidated by CDC.

## Staleness and LKG policy

- EPS LKG store: PDP persists successful EPS envelopes per `{subject_arn, application_id}`. Current default read tolerance used by PDP helper paths is 300 seconds.
- Degraded mode: When PDP serves from LKG or takes retry paths, `degraded_total` counter increments. UI surfaces degraded totals and percent.
- Hard‑evict: On sensitive CDC (e.g., delegation revoked), PDP marks keys as hard‑evicted and will not serve from LKG for those subjects/apps until expiry.

## CDC invalidation and lag

- Coarse invalidation (v1): Upon CDC topics such as `delegates_to.*`, `policy_ref.*`, `identity.belongs_to.*`, `controlled_by.*`, the subscriber evicts `eps:{subject}:*`.
- Revocations: additionally mark hard‑evict for the subject.
- Lag gauge (placeholder): If events include an ISO8601 `ts`, the subscriber updates `cdc_lag_ms` gauge as `(now - ts)`.

## Metrics

The built‑in simple metrics accumulator exposes the following counters/gauges:
- counters.eps_cache_l1_hits, counters.eps_cache_l2_hits, counters.eps_cache_misses
- counters.degraded_total
- gauges.cdc_lag_ms

UI Ops & Health surfaces:
- Cache hit rate, L1/L2 hits, and misses
- CDC lag (p95/p99 if available from backend; otherwise last observed)
- Degraded totals/percent

## Receipts and provenance

- PDP attaches `eps_etag` and `graph_snapshot_id` to decisions when available. UIs expose these under Provenance and provide a copyable receipt (decision_id, etag, snapshot, correlation_id).
- Application boundary is enforced; only rules with `application_id ∈ {request_app, global}` contribute.

## Operational guidance

- Prefer EPS for ABAC‑heavy use cases; enable Graph‑Eval per app for RTR/AppRights heavy workloads.
- Keep modest TTLs (EPS ≤ 5m; roles/delegation ≤ 60s) and monitor CDC lag; enable hard‑evict fast‑path for high‑risk revocations.
- Use Redis L2 for EPS when multiple PDP replicas or processes share workloads.
- Export metrics to your system of record if possible; otherwise the built‑in endpoints and UI provide a basic view.
