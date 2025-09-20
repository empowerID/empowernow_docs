---
title: Experience Plugins Configuration Reference
---

Use this page as the canonical source for configuring plugins in Experience. Link here from how‑tos instead of repeating settings.

## Contents
- [Config files and locations](#config-files-and-locations)
- [plugins.yaml schema](#pluginsyaml-schema)
- [Bundle storage and integrity](#bundle-storage-and-integrity)
- [BFF routes and auth](#bff-routes-and-auth)
- [Verification checklist](#verification-checklist)

## Config files and locations

| Purpose | Path |
|---|---|
| Plugin manifests (SoT) | `ServiceConfigs/BFF/config/plugins.yaml` |
| Plugin bundles | `ServiceConfigs/BFF/plugins/<pluginId>/<version>/index.esm.js` |
| BFF mounts | `/app/plugins` and `/app/config` |

## plugins.yaml schema

Minimal entry per tenant host:

```yaml
tenants:
  <tenant-host>:
    - id: <pluginId>
      version: "<semver>"
      engine:
        experience: ">=<min> <max"
      bundle:
        file: "/app/plugins/<pluginId>/<version>/index.esm.js"
        # integrity: "sha256:<hex>"  # optional
      permissions:
        api:
          - method: GET
            path: /api/...
        sse: []
      contributions:
        routes:
          - path: /hello
            component: Hello
            resource: plugin.route
            action: view
        widgets:
          - slot: dashboard.main
            component: HelloWidget
            resource: plugin.widget
            action: view
```

Key fields:

| Field | Description |
|---|---|
| `id` | Plugin identifier |
| `version` | Plugin bundle version (semver) |
| `engine.experience` | Host compatibility range |
| `bundle.file` | Absolute path inside container under `/app/plugins` |
| `bundle.integrity` | Optional sha256 hash; enforced if set |
| `permissions.api[]` | Method + path templates allow‑list |
| `permissions.sse[]` | SSE topic prefixes allow‑list |
| `contributions.routes[]/widgets[]` | Mount points and PDP hints |

## Bundle storage and integrity

- Store built ESM at `ServiceConfigs/BFF/plugins/<id>/<version>/index.esm.js`.
- Mount into container at `/app/plugins` (read‑only).
- Optional integrity:
  - Set `bundle.integrity: "sha256:<hex>"`.
  - BFF verifies at serve time; on mismatch returns 409 with `X-Integrity-Error: 1`.

## BFF routes and auth

- Manifests: `GET /api/plugins/manifests`
- Bundles: `GET /api/plugins/bundle?entry=<id>&id=<id>`
- Auth: both routes require session; SDK fetches with same‑origin cookies.
- Enforcement: requests from plugins carry `X‑Plugin‑Id`; BFF checks method+path templates per plugin.

## Verification checklist

- `GET /api/plugins/manifests` shows your plugin
- Bundle loads from `/api/plugins/bundle?...` with `200` and caching headers
- PDP pre‑gating permits contributions; denied ones are omitted
- Requests include `X‑Plugin‑Id`; allow‑list violations return `403` with `X-Allowlist-Violation: 1`

See also
- Overview: `../experience_plugins.md`
- BFF reference: `../../bff/reference/settings-reference.md`, `../../bff/reference/routes-reference.md`
