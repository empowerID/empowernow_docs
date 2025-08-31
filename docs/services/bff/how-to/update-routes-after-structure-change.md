---
id: update-routes-after-structure-change
title: Update BFF routes after backend or path restructure
sidebar_label: Update routes after restructure
tags: [service:bff, type:how-to, roles:developer, roles:devops]
---

Goal: fix broken SPA calls after service renames, path changes, or config moves.

Prereqs
- BFF running with `ServiceConfigs/BFF/config` mounted to `/app/config`
- Access to edit `routes.yaml`, `settings.yaml`, and `pdp.yaml`

Where to change things
- `ServiceConfigs/BFF/config/services` (inside `routes.yaml`): base URLs/timeouts per upstream
- `ServiceConfigs/BFF/config/routes.yaml`: client `path`, `target_service`, `upstream_path`, `methods`, `auth`, `authz`
- `ServiceConfigs/BFF/config/pdp.yaml`: `endpoint_map` for resource/action/id mapping
- `ServiceConfigs/BFF/config/settings.yaml`: CORS allowlist and redirect origins (dev vs prod)

Common symptoms → likely causes
- 404 at `/api/...`: missing or mismatched `path` in `routes.yaml`; Traefik not routing `/api/**` to BFF
- 401: missing session/cookies or wrong CORS/base URL in dev
- 403 with `NoMapping`: missing or outdated `endpoint_map` entry in `pdp.yaml`
- 403 with `Deny`: PDP policy denies; mapping exists but subject lacks permission
- 502/timeout: wrong `services.*.base_url` or upstream down

Step-by-step
1) Verify Traefik forwards `/api/**` to BFF on your host
   - Check Traefik config/labels for your host: `PathPrefix(/api/)` → BFF service
2) Update services and upstreams
   - In `routes.yaml:services`, ensure the renamed service and `base_url` are correct (port/path)
3) Update route entries
   - Ensure `path` reflects the new client shape (canonical `/api/<app>/*`)
   - Point `target_service` at the correct service key
   - Update `upstream_path` to match backend path; use `{path}` when forwarding a suffix
   - Set `auth: session` (or `bearer` for M2M) and `authz: pdp` if PDP applies
4) Update PDP endpoint mapping
   - In `pdp.yaml:endpoint_map`, add/update exact or templated keys for the new client path(s)
   - Ensure methods map to `resource`, `action`, and optionally `id_from` and `props` (JSONPath)
5) Align per-service token audiences (if `target_service` changed)
   - See How‑to → Session-to-service token bridging; ensure the service name is recognized for token minting
6) Dev vs prod base URL and CORS
   - Dev: set `VITE_BFF_BASE_URL` to the BFF origin (e.g., `http://localhost:8000/api`) and include your UI origin in CORS in `settings.yaml`
   - Prod: same-origin; set `VITE_BFF_BASE_URL` to `/api`

Quick validation
```bash
# Health
curl -v http://<bff-host>/health

# Expect 401 when unauthenticated
curl -v http://<bff-host>/api/<app>/items

# After login (browser), expect 200 or 403 depending on PDP
# Check BFF logs for mapping lines and PDP decision
```

Minimal examples
```yaml title="ServiceConfigs/BFF/config/routes.yaml (excerpt)"
services:
  my_service:
    base_url: "http://my-service:8080"
routes:
  - id: "my-items"
    path: "/api/myapp/items/*"
    target_service: "my_service"
    upstream_path: "/items/{path}"
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    auth: "session"
    authz: "pdp"
```

```yaml title="ServiceConfigs/BFF/config/pdp.yaml (excerpt)"
endpoint_map:
  /api/myapp/items:
    GET:
      resource: "my:item"
      action: "list"
  /api/myapp/items/{id}:
    GET:
      resource: "my:item"
      action: "read"
      id_from: "{id}"
```

Triage checklist
- VITE base URL correct; avoid double `/api`
- Traefik forwards `/api/**` to BFF
- Route `path` and `upstream_path` match new shapes
- Service `base_url` points to correct host/port
- `endpoint_map` covers new paths/methods
- Token audience mapping matches `target_service`
- CORS allowlist covers dev origin

See also
- Reference → YAML proxy (routes.yaml)
- Reference → routes.yaml Reference
- How‑to → Session-to-service token bridging
- How‑to → Validate endpoint_map entries
- Tutorials → React SPA + BFF — Golden Path

