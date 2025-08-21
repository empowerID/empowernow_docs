---
title: Plugins Ops Runbook
sidebar_label: Plugins Ops Runbook
description: Quarantine, refresh, allow-list triage, integrity checks, and headers to monitor for Experience plugins.
---

## Quarantine (kill switch)

- Block serving and use immediately:
  - `POST /api/plugins/quarantine/{id}`
  - `POST /api/plugins/unquarantine/{id}`
- Expect header `X-Plugin-Quarantined: 1` when blocked

## Refresh manifests

- `POST /api/plugins/refresh` reloads `plugins.yaml` without container rebuilds

## Allow-list triage

- Violations: 403 with `X-Allowlist-Violation: 1`
- Ensure SDK stamps `X-Plugin-Id`; check method+path template in `plugins.yaml`
- SSE prefixes must be declared under `permissions.sse`

## Integrity checks (optional)

- Configure `bundle.integrity: sha256:<hex>` in `plugins.yaml`
- Mismatch: 409 with `X-Integrity-Error: 1`

## Headers to monitor

- `Vary: Cookie, X-Plugin-Id` on manifests/bundles
- Bundle response headers: `Content-Type`, `ETag`, `Cache-Control`, `X-Content-Type-Options`, `Cross-Origin-Resource-Policy`

## QA additions

- Add smoke tests asserting allow-list violation and quarantine headers
- Verify canonical PDP subject shape (account ARN) in AuthZEN requests

See also: Canonical plugin reference `./experience_plugins`, Storage & Deployment `./plugins-storage-deployment`, BFF routing `../bff/devops/experience_routing`.

