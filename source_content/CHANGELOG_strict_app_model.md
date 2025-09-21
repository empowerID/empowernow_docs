# Strict Application Model Rollout

## Summary
- Enforced single application identifier with AuthZEN compliance: defaults to `global` if `resource.properties.pdp_application` is omitted.
- Canonical policy roots only: `policies/global`, `policies/domains/<domain>/{shared,environments/<env>}`, `policies/applications/<app-id>`.
- No orphans: integrity CLI checks 1:1 app↔folder and canonical dirs exist.
- Loader/PDP strict path; no fallbacks; security boundary enforced.

## Performance and UX
- Backend list endpoints return lean JSON and validators (ETag + Last-Modified) with 304 handling.
- Frontend uses SWR and conditional GETs, enabling instant paints with background freshness.

## API Endpoints
- Global policies: `GET/POST /api/v1/policies/global`, `GET /api/v1/policies/global/{id}`
- Application policies: `GET /api/v1/applications/{app}/policies`
- Domains: `GET /api/v1/domains`, `GET /api/v1/domains/{domain}/policies`
- Applications registry: `GET /api/authz/applications`

## Tooling
- `src/app/integrity_cli.py`: preflight checks (bijective app↔folder, canonical dirs)
- `ServiceConfigs/pdp/tools/canonicalize_policies.py`: archives non-canonical items and creates missing app dirs

## Frontend
- PDP UI: app selector + context pill in Visualizer/Playground; scoped policy tabs; friendly errors; decision source counts.

## Tests
- Added `test_http_cache_smoke.py` to verify 304 on conditional GETs.
