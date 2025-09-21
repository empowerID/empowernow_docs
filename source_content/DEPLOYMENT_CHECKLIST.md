# Deployment Checklist – SCIM VDS

## Pre-reqs
- Redis reachable and configured (REDIS_URL)
- Connectors catalogs present:
  - `SYSTEM_TYPES_DIR`
  - `SYSTEMS_DIR`
- SCIM directories file: `SCIM_DIRECTORIES_FILE`

## Settings
- SCIM
  - `SCIM_ENABLED=true`
  - `SCIM_TENANT=<tenant>`
  - `PDP_BASE_URL=http://pdp:8001` (authorize writes; enable fail-closed in prod)
  - Auth (choose one):
    - Static: `SCIM_REQUIRE_AUTH=true`, `SCIM_STATIC_BEARER_TOKEN=...`
    - Introspection: `SCIM_REQUIRE_AUTH=true`, `SCIM_OAUTH_INTROSPECTION_URL=...` (+ optional client id/secret)
  - mTLS (optional): `SCIM_REQUIRE_MTLS=true`
  - Rate limiting: `SCIM_RATE_CAPACITY`, `SCIM_RATE_REFILL_PER_SEC`
  - Writes (optional): `SCIM_WRITES_ENABLED`, `SCIM_WRITE_REREAD`, `SCIM_WRITE_IDEMPOTENCY_TTL_S`
  - Cookies: `MAX_COOKIE_BYTES` (default 2048)
  - totalResults: prefer off; if enabled, cap with `SCIM_TOTAL_RESULTS_CAP`
- Admin
  - Expose admin app with `/admin/metrics`, `/admin/views`, `/admin/systems`, `/admin/config/status`, `/admin/cdc`

## Health
- SCIM: `/scim/v2/ServiceProviderConfig` returns 200
- Admin: `/admin/metrics` returns Prometheus text

## Metrics (Prometheus)
- `vds_scim_latency_seconds_bucket/_count/_sum`
- `vds_provider_latency_seconds_*`, `vds_aggregator_latency_seconds_*`
- `vds_provider_calls_total{system,outcome}`
- `vds_scim_cache_l1_*`, `vds_scim_cache_l2_*`
- `vds_scim_rate_limit_total`

## Dashboards
- SCIM latency P50/P95, provider outcome rates, cache hit ratio, 429s by route

## Rollout
- Start with SCIM read-only (writes disabled)
- Enable PDP fail-closed
- Validate views and capabilities via `/scim/v2/Directories` and docs config

## Traefik examples (SCIM HTTP)

### Static file (traefik.yml)
```yaml
http:
  routers:
    vds-scim:
      rule: "Host(`vds.example.com`) && PathPrefix(`/scim/v2`)"
      service: vds-scim
      entryPoints: [ websecure ]
      tls: {}
  services:
    vds-scim:
      loadBalancer:
        servers:
          - url: "http://vds:8011"
```

### Docker labels (compose)
```yaml
services:
  vds:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.vds-scim.rule=Host(`vds.example.com`) && PathPrefix(`/scim/v2`)"
      - "traefik.http.routers.vds-scim.entrypoints=websecure"
      - "traefik.http.routers.vds-scim.tls=true"
      - "traefik.http.services.vds-scim.loadbalancer.server.port=8011"
```

## Hot reload
- Editing `SCIM_DIRECTORIES_FILE` should reflect on `/scim/v2/Directories` quickly
- Use `/admin/config/status` to verify file hashes/mtimes

## CDC
- Wire your pipeline to POST events to `/admin/cdc` (optional test-only endpoint) or call `handle_cdc_event` from your subscriber

