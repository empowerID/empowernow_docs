---
title: Experience Plugins — Storage & Deployment Guide
sidebar_label: Plugins Storage & Deployment
description: How plugins are built, stored, configured, served, enforced, and operated in the Experience platform.
---

## Purpose

Document how plugins are built, stored, configured, served, and operated in the Experience platform using file‑backed, same‑origin ESM bundles served by the BFF.

## Scope

- Experience SPA host and plugin system
- BFF plugin storage, serving, and enforcement
- Dev workflow and DevOps operations for deploying, updating, and rolling back plugins

## 1) High‑level model

- Plugins are authored outside the host app and built as same‑origin ESM bundles.
- The BFF serves:
  - Manifests from `ServiceConfigs/BFF/config/plugins.yaml`
  - Bundles from file paths mounted read‑only under `/app/plugins`
- The SPA:
  - Discovers manifests → batches PDP pre‑gating → dynamically imports file‑backed bundles → mounts contributions
- Runtime calls from plugins are enforced by the BFF via method+path allow‑lists and `X-Plugin-Id` (see Plugins reference).

## 2) Storage layout (source of truth)

- Host filesystem (checked into your configuration repo):
  - `ServiceConfigs/BFF/plugins/<pluginId>/<version>/index.esm.js`
- Container mount (BFF):
  - `/app/plugins` (read‑only)
- Configuration (BFF):
  - `ServiceConfigs/BFF/config/plugins.yaml` → declares each plugin plus its bundle file path

Compose mounts

- docker‑compose‑authzen4.yml (BFF):
  - `../ServiceConfigs/BFF/plugins:/app/plugins:ro`
  - `../ServiceConfigs/BFF/config:/app/config:ro`
- docker‑compose‑nowconnect.yml (BFF):
  - `../ServiceConfigs/BFF/plugins:/app/plugins:ro`
  - `../ServiceConfigs/BFF/config:/app/config:ro`

## 3) Plugin config: `ServiceConfigs/BFF/config/plugins.yaml`

Example (hello, page, and widget plugins):

```yaml
tenants:
  experience.ocg.labs.empowernow.ai:
    - id: hello
      version: "1.0.0"
      engine:
        experience: ">=1.0.0"
      bundle:
        file: "/app/plugins/hello/1.0.0/index.esm.js"
        # integrity: "sha256:<optional_hex_hash>"
      permissions:
        api:
          - method: GET
            path: /api/plugins/secure-echo
          - method: POST
            path: /api/plugins/telemetry
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

    - id: hello-page
      version: "1.0.0"
      engine:
        experience: ">=1.0.0"
      bundle:
        file: "/app/plugins/hello-page/1.0.0/index.esm.js"
      permissions:
        api:
          - method: GET
            path: /api/plugins/secure-echo
        sse: []
      contributions:
        routes:
          - path: /hello-page
            component: HelloPage
            resource: plugin.route
            action: view

    - id: hello-widget
      version: "1.0.0"
      engine:
        experience: ">=1.0.0"
      bundle:
        file: "/app/plugins/hello-widget/1.0.0/index.esm.js"
      permissions:
        api:
          - method: POST
            path: /api/plugins/telemetry
        sse: []
      contributions:
        widgets:
          - slot: dashboard.main
            component: HelloWidget
            resource: plugin.widget
            action: view
```

Key fields

- `id`/`version`/`engine.experience`: identity and compatibility range
- `bundle.file`: absolute file path inside the container under `/app/plugins`
- `bundle.integrity` (optional): content hash enforced at serve time
- `permissions`: allow‑list of method+path templates and SSE prefixes
- `contributions`: routes and/or widgets with PDP hints

## 4) Bundle contract (file‑backed ESM)

Minimal examples (stored under `ServiceConfigs/BFF/plugins/...`):

Hello Page bundle (`hello-page/1.0.0/index.esm.js`)

```js
import * as React from 'react';

export const routes = {
  HelloPage: () => React.createElement(
    'div',
    { className: 'glass-card p-4' },
    'Hello World Page'
  )
};

export default { routes };
```

Hello Widget bundle (`hello-widget/1.0.0/index.esm.js`)

```js
import * as React from 'react';

export const widgets = {
  HelloWidget: () => React.createElement(
    'div',
    { className: 'glass-card p-2' },
    'Hello World Widget'
  )
};

export default { widgets };
```

Authoring rules

- Export `routes` and/or `widgets` as plain objects of React components.
- Treat `react`, `react-dom`, and `@empowernow/ui` as externals; they are provided by the host.
- No global CSS or external scripts; CSP remains strict (`script-src 'self'`).

## 5) SPA integration

- Manifests: `GET /api/plugins/manifests` (cookie‑auth, same‑origin)
- Import: SPA uses dynamic import on a URL pointing to the plugin bundle.

Current SPA loader URL pattern

- The loader requests:
  - `/api/plugins/bundle?entry=<pluginId>&id=<pluginId>`
- Examples:
  - `/api/plugins/bundle?entry=hello-page&id=hello-page`
  - `/api/plugins/bundle?entry=hello-widget&id=hello-widget`

Note: The BFF maps `id` to the configured `bundle.file` and streams the file back as `text/javascript`.

## 6) BFF serving logic (what changed)

- Manifests
  - Loaded from `plugins.yaml` into memory per tenant host.
  - Allow‑lists compiled for runtime request enforcement.
- Bundles
  - For each request to `/api/plugins/bundle?...`:
    - Check quarantine → 403 with `X-Plugin-Quarantined: 1` if blocked.
    - Resolve `id` to its configured `bundle.file` (from `plugins.yaml`).
    - Root‑jail: Only serve files under `/app/plugins`.
    - Integrity (optional): if `integrity` is set, verify the sha256 of the file content; on mismatch return 409 with `X-Integrity-Error: 1`.
    - Serve via `FileResponse` with:
      - `Content-Type: text/javascript; charset=utf-8`
      - `ETag: sha256-<hex>`
      - `Cache-Control: public, max-age=31536000, immutable`
      - `X-Content-Type-Options: nosniff`
      - `Cross-Origin-Resource-Policy: same-origin`
- Authentication
  - Route is `auth: session` in `routes.yaml`, so an authenticated session is required to fetch bundles.
- Security
  - Same‑origin ESM: no CSP relaxation needed.
  - Root‑jail ensures no path traversal outside `/app/plugins`.

## 7) Runtime enforcement (recap)

- BFF Middleware enforces allow‑lists per plugin:
  - HTTP calls must include header `X-Plugin-Id: <id>`
  - Method+path validated against templates compiled from `permissions.api`
  - SSE prefixes validated against `permissions.sse`
  - Violations return 403 with `X-Allowlist-Violation: 1`.
- SPA pre‑gates at render time using AuthZEN batch calls, so contributions are mounted only when permitted.

## 8) Developer workflow

Build

- Author routes and/or widgets and export as ESM.
- Externalize `react`, `react-dom`, `@empowernow/ui`.
- Produce a single file bundle (e.g., `index.esm.js`).

Place

- Copy the built bundle to:
  - `ServiceConfigs/BFF/plugins/<pluginId>/<version>/index.esm.js`

Configure

- Add/Update an entry under `ServiceConfigs/BFF/config/plugins.yaml`:
  - Set `id`, `version`, `engine.experience`.
  - Set `bundle.file` to `/app/plugins/<pluginId>/<version>/index.esm.js`.
  - Add `contributions` and `permissions`.

Deploy

- The BFF containers mount:
  - `../ServiceConfigs/BFF/plugins:/app/plugins:ro`
  - `../ServiceConfigs/BFF/config:/app/config:ro`
- Restart/reload the BFF to pick up config changes (and bundles).

Verify

- Hit `GET /api/plugins/manifests` (authenticated session) and confirm your plugin appears.
- Navigate to the route or widget location in the Experience SPA.
- Inspect the Network tab for `GET /api/plugins/bundle?...` with 200 and strong caching headers.

## 9) Operations & DevOps

Atomic rollout (recommended)

- Stage new bundle files under `ServiceConfigs/BFF/plugins/.staged/...`
- After pushing the config entry, flip the directory or symlink in one step to the final `/app/plugins/<id>/<version>` path to avoid broken references.

Integrity management (optional but recommended)

- Compute a sha256 hash of the final ESM file and record it as `bundle.integrity: "sha256:<hex>"`
- On mismatch, the BFF fails closed with 409 and `X-Integrity-Error: 1`.

Quarantine

- Immediate kill switch to block serving and use:
  - `POST /api/plugins/quarantine/{plugin_id}`
  - `POST /api/plugins/unquarantine/{plugin_id}`

Hot reload of manifests

- `POST /api/plugins/refresh` triggers the BFF to reload `plugins.yaml`.

Monitoring (minimum recommended)

- Track bundle serve outcomes and latencies by `{tenant, plugin_id, version}`.
- Track allow‑list denials and quarantine events.

Backups

- Treat `ServiceConfigs` as the configuration SoT; ensure your normal config backup processes include the plugins folder and `plugins.yaml`.

## 10) Security posture

- Same‑origin ESM; strict CSP.
- No runtime tokens in browser; cookies + CSRF via BFF.
- PDP pre‑gating at render time; BFF allow‑list enforcement at request time.
- Root‑jail for bundles (`/app/plugins`).
- Optional integrity checks on bundles.

## 11) Example end‑to‑end (Hello Page + Hello Widget)

Files

- `ServiceConfigs/BFF/plugins/hello-page/1.0.0/index.esm.js` (exports `routes.HelloPage`)
- `ServiceConfigs/BFF/plugins/hello-widget/1.0.0/index.esm.js` (exports `widgets.HelloWidget`)

Configuration

- `ServiceConfigs/BFF/config/plugins.yaml` entries for `hello-page` and `hello-widget` pointing to `/app/plugins/.../index.esm.js`, with contributions and permissions.

Runtime

- SPA discovers manifests, then imports:
  - `/api/plugins/bundle?entry=hello-page&id=hello-page`
  - `/api/plugins/bundle?entry=hello-widget&id=hello-widget`
- BFF serves file‑backed ESM with long‑lived immutable caching and ETags.
- Contributions mount only when permitted by PDP decisions.

## 12) Developer checklist

- Build as ESM; exports `routes` and/or `widgets`.
- No external UI kits; use `@empowernow/ui`.
- Externals: `react`, `react-dom`, `@empowernow/ui`.
- Place under `ServiceConfigs/BFF/plugins/<id>/<version>/index.esm.js`.
- Configure `plugins.yaml` with `bundle.file`, contributions, and permissions.
- Restart/reload BFF; verify `manifests` and network import URL.
- Ensure PDP pre‑gating passes for your test user; mount points render.
- Calls go through the SDK and carry `X-Plugin-Id`; 403s indicate allow‑list or authz issues.

## 13) Appendix – API reference (BFF‑facing)

- `GET /api/plugins/manifests`
  - Returns `PluginManifest[]` scoped by tenant host
  - Headers: `Vary: Cookie, X-Plugin-Id` (for manifests, not bundles)
- `GET /api/plugins/bundle?entry=<id>&id=<id>`
  - Returns ESM bundle file
  - Headers:
    - `Content-Type: text/javascript; charset=utf-8`
    - `ETag: sha256-<hex>`
    - `Cache-Control: public, max-age=31536000, immutable`
    - `X-Content-Type-Options: nosniff`
    - `Cross-Origin-Resource-Policy: same-origin`
  - Errors:
    - 403 with `X-Plugin-Quarantined: 1` if quarantined
    - 404 unknown plugin
    - 409 with `X-Integrity-Error: 1` on integrity mismatch
- `POST /api/plugins/refresh` → reload manifests from config
- `POST /api/plugins/quarantine/{id}`
- `POST /api/plugins/unquarantine/{id}`

## 14) Notes on compatibility

- The SPA loader continues to use query params; no host code changes required.
- Future‑proofing: if you later switch to path params (e.g., `/api/plugins/bundle/{pluginId}/{version}`) you can run both handlers in parallel and migrate the SPA loader when convenient.

---

See also:

- Experience → Plugins: `./plugins`
- Experience → Plugin Development Guide: `./plugin_guide`
- BFF → Experience Routing & Config: `../bff/devops/experience_routing`


