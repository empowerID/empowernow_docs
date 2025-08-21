---
title: Plugins API Reference (BFF-facing)
sidebar_label: Plugins API Reference
description: API endpoints for Experience plugins (manifests, bundles, refresh, quarantine) and expected headers.
---

## Endpoints

- `GET /api/plugins/manifests` → `PluginManifest[]` (scoped by tenant host)
- `GET /api/plugins/bundle?entry=<id>&id=<id>` → ESM bundle file
- `POST /api/plugins/refresh` → reload manifests from config
- `POST /api/plugins/quarantine/{id}` → quarantine a plugin
- `POST /api/plugins/unquarantine/{id}` → reverse quarantine

## Headers

- Baseline response headers (bundles):
  - `Content-Type: text/javascript; charset=utf-8`
  - `ETag: sha256-<hex>`
  - `Cache-Control: public, max-age=31536000, immutable`
  - `X-Content-Type-Options: nosniff`
  - `Cross-Origin-Resource-Policy: same-origin`
- Caching correctness:
  - `Vary: Cookie, X-Plugin-Id` on manifests/bundles
- Enforcement signals:
  - `X-Plugin-Quarantined: 1` (403) when blocked
  - `X-Allowlist-Violation: 1` (403) when allow-list fails
  - `X-Integrity-Error: 1` (409) on hash mismatch

See also: Canonical plugin reference `./experience_plugins` and Ops Runbook `./ops-runbook`.

