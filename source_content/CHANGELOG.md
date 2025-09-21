# Changelog

## [Unreleased]
- SCIM V2 server: stable unified IDs, PDP read gating (fail-closed option), per-client rate limiting
- Views: base/scope/profile with enforce_profile and filter conjunction; admin views discovery
- Pagination: Redis-backed offset index, snapshots; totalResults modes (off/approx/accurate)
- Sorting: sortBy/sortOrder enforcement; page-local client-side fallback
- Mapping profiles: scim_user, scim_group, scim_user_ad, scim_group_ad
- Metrics: Prometheus counters/histograms (SCIM latency, provider/aggregator latencies, cache hit/miss, provider_calls_total, 429s)
- Audit: non-PII audit for SCIM list; filter hash and page metadata
- CDC: cache/index invalidation helpers + admin injection endpoint `/admin/cdc`
- Hot reload: SCIM directories file reload; inline refresh on `/scim/v2/Directories`
- Admin: systems discovery endpoints; config status hashes at `/admin/config/status`
- Security: OAuth2 bearer (static/introspection) and optional mTLS enforcement

## Tests
- Coverage for: discovery, mapping profiles, views, pagination snapshots, PDP gating, rate limiting, metrics, audit, ids resolution, invalidation (writes/CDC), totalResults modes, error envelope, auth, hot-reload, admin endpoints

## Docs
- Updated SCIM interface document with settings, examples, views, metrics

