---
id: session-to-service-token-bridging
title: Session-to-service token bridging in the BFF
description: How the BFF validates the SPA session and proxies to backend services using per‑service OAuth access tokens, plus the configuration required across BFF and IdP.
sidebar_label: Session → service token bridging
---

## What this process is

- **Session-to-service token bridging in the BFF**.
- The BFF validates the SPA’s session cookie, then proxies the request to a backend `target_service` using a service‑scoped access token (audience‑bound to that service). It maps tokens per service name and attaches the correct `Authorization` header on the upstream hop.

## Why it’s needed

- **Backends require OAuth access tokens** and will not accept your browser cookie (e.g., Analytics, CRUD, PDP).
- The BFF holds the user session and, on behalf of the user, **mints/keeps per‑service tokens**. Without a mapped token for the specific `target_service`, the BFF logs `NO_TOKEN_AVAILABLE` and returns `401`.

## How it works (runtime flow)

1. SPA calls a canonical BFF route (for example, `GET /api/v1/analytics/workflows`).
2. BFF matches the YAML route, sets `target_service=analytics_service`, and requires session auth.
3. BFF looks up a token in the session store keyed by `target_service`.
   - If a token exists and its `aud` matches Analytics, the BFF injects `Authorization: Bearer <token>` and forwards.
   - If not, you see in logs: `service=analytics_service NO_TOKEN_AVAILABLE → 401`.

## What must be configured (BFF + IdP)

Goal: Align audiences/scopes so the BFF can mint and map a token for the service name used in `routes.yaml`.

### 1) BFF route to target_service

- File: `ServiceConfigs/BFF/config/routes.yaml`
- Ensure a route exists and points to the logical service name the BFF uses for token lookup:

```yaml
# Already correct
services:
  analytics_service:
    base_url: "http://analytics:8100"
routes:
  - id: "api-analytics"
    path: "/api/v1/analytics/*"
    target_service: "analytics_service"
    upstream_path: "/api/v1/analytics/{path}"
    auth: "session"
```

### 2) IdP: allow audience issuance for that service

- File: `ServiceConfigs/IdP/config/settings.yaml`
- Map a scope you grant at login (for example, `application.all`) to include the Analytics audience so the IdP can issue a token for it.

```yaml
token:
  audience_mappings:
    scope_mappings:
      - scope: application.all
        audiences:
          - https://idp.ocg.labs.empowernow.ai/api/admin
          - https://idp.ocg.labs.empowernow.ai/api/v1
          - https://crud.ocg.labs.empowernow.ai
          - empowernow
          - https://analytics.ocg.labs.empowernow.ai   # added
```

### 3) IdP: allow the BFF client to request that audience

- File: `ServiceConfigs/IdP/config/clients.yaml` (client: `bff-server`)

```yaml
bff-server:
  # ...
  scopes: [openid, profile, email, offline_access, admin.api, application.all]
  allowed_audiences:
    - empowernow
    - https://analytics.ocg.labs.empowernow.ai        # added
```

### 4) BFF: service → audience mapping (token minting/validation)

- File: `ServiceConfigs/BFF/config/<settings file>` (the BFF reads a `service_audiences` map used by `session_manager.get_service_audience(service)`)
- Add Analytics mapping so the BFF knows which audience to request/validate for `analytics_service`:

```yaml
service_audiences:
  crud_service:       https://crud.ocg.labs.empowernow.ai
  pdp_service:        https://authz.ocg.labs.empowernow.ai/api/v1
  idp_service:        https://idp.ocg.labs.empowernow.ai/api/v1
  analytics_service:  https://analytics.ocg.labs.empowernow.ai    # add this
service_scopes:
  analytics_service:  application.all    # or api.read if you enforce finer scope
```

- Names must match the `target_service` in `routes.yaml` (`analytics_service`).

## Example: Analytics

- Symptom: BFF logs show `NO_TOKEN_AVAILABLE service=analytics_service → 401`.
- Fix you made:
  - Added Analytics audience to IdP `application.all` and to `bff-server.allowed_audiences`.
- Remaining step (BFF config):
  - Add `analytics_service → https://analytics.ocg.labs.empowernow.ai` in BFF `service_audiences` (and optional `service_scopes`).
- Restart IdP and BFF; log out/in once so the session refreshes and tokens are minted.
- Re‑test. BFF logs should show `token_found=True` for `analytics_service` and upstream `200`.

## Troubleshooting

- If route is correct but still 401:
  - Check BFF log line: `NO_TOKEN_AVAILABLE service=analytics_service`. That means the `service_audiences` map or IdP audience/scopes are not aligned.
- If `token_found=True` but upstream `401`:
  - Check the audience value matches the backend’s required `aud` exactly.
- Verify `services_count` in “Session status check successful” includes analytics after login.

## Quick checklist

- BFF `routes.yaml`: `target_service` present and correct.
- IdP `settings.yaml`: scope → audience mapping includes the service audience.
- IdP `clients.yaml` (`bff-server`): `allowed_audiences` includes the service audience.
- BFF settings: `service_audiences` (and `service_scopes`) include the service name used by routes.
- Restart IdP and BFF; re‑authenticate.

## See also

- `services/bff/explanation/authentication.md`
- `services/bff/how-to/spa-with-bff.md`


