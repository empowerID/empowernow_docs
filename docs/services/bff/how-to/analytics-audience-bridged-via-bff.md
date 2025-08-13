---
id: analytics-audience-bridged-via-bff
title: Audience‑bridged Analytics via BFF (Admin & Dev brief)
description: Admin and developer brief for enabling Analytics via the BFF using audience‑scoped tokens, including config ownership, rollout steps, verification, and troubleshooting.
sidebar_label: Analytics via BFF (audience‑bridged)
---

## What changed

- Added Analytics as a first‑class BFF‑proxied service. The BFF now mints/uses a service token for `analytics_service` so SPA calls to `/api/v1/analytics/*` succeed under session auth.

## Why

- Backends don’t accept browser cookies. The BFF validates the SPA session and forwards with a service‑scoped access token (audience‑bound to the target backend). Without a token for the target service, the BFF returns `401`.

## Files and ownership

- BFF routing (unchanged; for reference)
  - `ServiceConfigs/BFF/config/routes.yaml`
  - Route id: `api-analytics` mapping `/api/v1/analytics/*` → `analytics_service` (session auth).
  - Owner: BFF platform team.

- IdP configuration (audiences/scopes)
  - `ServiceConfigs/IdP/config/settings.yaml`
    - Added Analytics audience under scope mapping for `application.all`.
  - `ServiceConfigs/IdP/config/clients.yaml`
    - `bff-server.allowed_audiences` includes `https://analytics.ocg.labs.empowernow.ai`.
  - Owner: IdP platform team.

- BFF settings
  - `ms_bff_spike/config/settings.yaml`
    - Ensured login scopes include `application.all`.
  - Owner: BFF platform team.

- BFF token mapping (temporary V1)
  - `ms_bff_spike/ms_bff/src/api/v1/endpoints/auth.py`
    - Extended service token map with:
      - `analytics_service` → audience `https://analytics.ocg.labs.empowernow.ai`
      - required scopes: `api.read | api.write | application.all`
  - Owner: BFF platform team (will move to config in V2).

## Admin guide (rollout)

- Pre‑reqs
  - Confirm `routes.yaml` has `api-analytics` and `target_service: analytics_service`.

- Change set
  - IdP: add Analytics audience to `application.all`, allow for `bff-server` client.
  - BFF: ensure `auth.oauth_scopes` includes `application.all`.
  - BFF: add `analytics_service` to the service token mapping (V1).

- Deploy
  - Restart IdP, then restart BFF.
  - Ask users to log out/in (new session) and hard refresh SPA.

- Verify
  - DevTools Network:
    - `GET /api/v1/analytics/*` returns 200.
  - BFF logs:
    - Look for `bff_service_tokens_mapped` including `analytics_service`.
    - Proxy lines show `token_found=True` for `service=analytics_service`.

- Troubleshooting
  - `401` and logs show `NO_TOKEN_AVAILABLE service=analytics_service`:
    - The service wasn’t in the token map or IdP audience wasn’t permitted.
  - `401` with `token_found=True`:
    - Token audience mismatch; confirm audience exactly equals `https://analytics.ocg.labs.empowernow.ai`.
  - Old session:
    - Log out/in to refresh tokens after config changes.

- Security notes
  - Keep audiences least‑privileged. Prefer `api.read` where possible; `application.all` is used here for compatibility and will be narrowed in V2.
  - BFF is the only component that holds/forwards service tokens.

## Dev guide (SPA teams)

- Canonical paths (no change)
  - Always call Analytics via BFF:
    - `/api/v1/analytics/workflows`
    - `/api/v1/analytics/authorization-metrics?service=crud`
    - `/api/v1/analytics/anomalous-access-patterns?...`
  - Include credentials in fetch; our helper does this.

- Expected responses
  - `200` with JSON on success; `401` means the BFF service token isn’t available (not a front‑end bug).

## Snippets

- IdP scope → audience mapping (`settings.yaml`)

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
          - https://analytics.ocg.labs.empowernow.ai
```

- IdP `bff-server` allowed audiences (`clients.yaml`)

```yaml
bff-server:
  allowed_audiences:
    - empowernow
    - https://analytics.ocg.labs.empowernow.ai
```

- BFF login scopes (`settings.yaml`)

```yaml
auth:
  oauth_scopes: "openid profile email application.all offline_access"
```

- BFF service token map (V1, `auth.py`)

```python
"analytics_service": {
  "audience": "https://analytics.ocg.labs.empowernow.ai",
  "scopes": ["api.read", "api.write", "application.all"]
}
```

## See also

- `services/bff/how-to/session-to-service-token-bridging`


