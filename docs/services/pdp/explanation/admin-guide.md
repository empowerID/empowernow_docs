---
title: PDP Admin Guide — Domain & Application Policy Model
description: Config locations, admin APIs, feature flags, observability, rollout, and ops for the domain/application policy model.
---

## Config locations

Root: `SERVICE_CONFIG_DIR` (Compose mounts `../ServiceConfigs/pdp/config`).

- Applications: `config/applications/*.yaml`
- Domains: `config/domains/*.yaml`
- PIP Registry: `config/pip_registry.yaml`
- Policies:
  - Global: `config/policies/global/`
  - Domain shared: `config/policies/domains/{domain}/shared/`
  - Environment: `config/policies/domains/{domain}/{environment}/`
  - Application: `config/policies/applications/{app_id}/`

## Admin APIs (via BFF)

- Apps: `/api/authz/applications` (GET, POST), `/api/authz/applications/{id}` (GET, PUT, DELETE)
- Domains: `/api/authz/domains` (GET, POST), `/api/authz/domains/{id}` (GET, PUT, DELETE)
- PIPs: `/api/authz/pips` (GET, PUT), `/api/authz/pips/{name}` (GET, PUT, DELETE)
- Debug: `/api/authz/debug/applications/{app_id}/policy-sources`

## Policy review and merge workflow

- Feature flag: `FEATURE_POLICY_MERGE_ENABLED` (default: off). When enabled, PDP exposes `POST /access/v1/policies/merge`.
- Self-authorization: PDP evaluates an AuthZEN request internally to authorize merges.
  - Resource: `pdp:policy`
  - Action: `merge`
  - Required permit example:

```yaml
id: pdp-merge-admin
rules:
  - resource: pdp:policy
    action: merge
    effect: PERMIT
    when: "'pdp_admin' in subject.properties.roles"
```

### End-to-end steps
1) Open workspace in Authorization Studio → edit YAML (Diff/Lints/Impact tabs).
2) Click “Review & Merge” → client validates and posts draft to PDP validate endpoint.
3) If clean, client calls `POST /access/v1/policies/merge` with `{ policy_id, yaml, message }`.
4) PDP checks flag, performs self-authorization, writes YAML, refreshes caches.
5) UI shows success with updated effective policies; failures include PDP explanation.

### cURL example (authorized)
```bash
curl -sS -X POST https://authz.ocg.labs.empowernow.ai/access/v1/policies/merge \
  -H "Cookie: <session>" \
  -H "Content-Type: application/json" \
  -d '{"policy_id":"global-base-security","yaml":"id: global-base-security\n...","message":"Tighten base guards"}'
```

### Troubleshooting
- 404: feature flag off → set `FEATURE_POLICY_MERGE_ENABLED=true` and restart PDP.
- 403: missing `pdp:policy merge` permit → add/adjust admin policy and reload.
- 400: YAML invalid → use `/access/v1/policies/validate` first; fix lints.

## Observability: Grafana dashboards

- Grafana provisioned via `ServiceConfigs/observability/grafana`.
- “PDP Debugging” includes:
  - Explain requests/min (Loki `api.request.start` + `debug_explain`).
  - Sandbox streams/min (Loki `api.request.start` + `sandbox_stream`).
  - Explain latency p50/p95 from `duration_ms`.
  - Cache hits/min from `cache.hit`.

Restart Grafana:
```bash
docker compose -f docker-compose-authzen4.yml restart grafana
```

## SPA performance

- ETag + Last-Modified on GETs; `Cache-Control: public, max-age=60`
- Client sends `If-None-Match`/`If-Modified-Since` for 304s

Expected headers when cached:
```
ETag: W/"<sha256>"
Last-Modified: Tue, 24 Sep 2025 20:41:15 GMT
Cache-Control: public, max-age=60
```

## Feature flags

- `FEATURE_POLICY_ADMIN_SELF_AUTH` (default: false): PDP self-authorizes admin ops by evaluating AuthZEN requests (`pdp:domain edit`, `pdp:application delete`).

Example policy snippet (enable domain edits for `pdp_admin`):

```yaml
id: pdp-admin-ops
policy_type: AuthZ
rules:
  - resource: pdp:domain
    action: edit
    effect: PERMIT
    allowIf: "subject.role == 'pdp_admin'"
```

## Curl checks

```bash
curl -i https://authz.ocg.labs.empowernow.ai/api/authz/applications -H "Cookie: <session>"

# Conditional GET
curl -i https://authz.ocg.labs.empowernow.ai/api/authz/applications \
  -H "If-None-Match: W/\"<etag>\"" -H "Cookie: <session>"

# Domains list
curl -i https://authz.ocg.labs.empowernow.ai/api/authz/domains -H "Cookie: <session>"
```

## Playwright

```bash
cd pdp_ui/frontend
npx playwright test --project=chromium
```

## Recovery

- Revert YAML under `ServiceConfigs/pdp/config` via Git.
- Disable self-auth quickly by unsetting `FEATURE_POLICY_ADMIN_SELF_AUTH` and restarting PDP.

## Operations playbook

### Restart services

```bash
docker compose -f docker-compose-authzen4.yml restart bff
docker compose -f docker-compose-authzen4.yml restart pdp
docker compose -f docker-compose-authzen4.yml restart traefik
```

Verify health:

```bash
curl -sf https://authz.ocg.labs.empowernow.ai/api/authz/health || echo fail
```

### Verify config mount

```bash
docker exec -it pdp_app sh -c 'ls -la /app/config && grep -H "id:" /app/config/applications/*.yaml | head'
```

### Add an application (UI)

Admin → Applications → New Application → Save. YAML is written under `config/applications/<id>.yaml`.

### Add a domain (UI)

Admin → Domains → New Domain → set environments and shared folder → Save.

### Toggle a PIP

Admin → PIPs → switch a PIP on/off. Configuration persists to `pip_registry.yaml`.

## Concepts and architecture

- Single identifier (`pdp_application`) selects app; domain/env resolution is internal.
- Inheritance order (if defined): global → domain shared → env → app-specific.
- SPA calls BFF; BFF proxies to PDP. Traefik routes `/api/**` from SPA hosts to BFF.

## Troubleshooting

- HTML instead of JSON: ensure Traefik SPA static routers exclude `/access/v1/` and BFF API router includes `/access/v1/` and `/api/` for SPA hosts.
- 403 on admin ops: either self-auth flag is on and policy denies, or session missing. Check PDP logs and BFF logs; disable self-auth to confirm.
- No 304 responses: confirm ETag/Last-Modified present; check intermediary stripping headers; retry with direct curl; ensure clocks are reasonably synced.
- Admin routes 404: ensure BFF routes include `/api/authz/{applications,domains,pips,debug}` and BFF is restarted.
- Policy changes ignored: validate YAML; check PDP logs for load errors; ensure file paths under `config/policies/**` are correct.


