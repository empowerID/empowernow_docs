---
title: QA Test Plan (Experience Plugins)
sidebar_label: QA Test Plan
description: Matrices and scenarios covering authZ states, SSE stability, isolation, integrity/quarantine, a11y, visual regression, and basic RUM.
---

## Matrices

AuthZ states × contributions × headers:

- Permit → route/widget mounts, 200s, no violations
- Deny → no mount; or disabled UI; PDP decision logged
- Error → fail closed; show fallback; do not mount

Headers:

- Quarantine → `X-Plugin-Quarantined: 1` on bundle/API
- Allow‑list violation → `X-Allowlist-Violation: 1` on 403
- Integrity mismatch → 409 `X-Integrity-Error: 1`

## SSE stability

- Reconnect on network flap; no duplicate events
- Multiple tabs limited by per‑plugin SSE quotas

## Isolation

- Cross‑tenant: manifests scoped by Host header
- Cross‑plugin: `X-Plugin-Id` enforced per request

## a11y & visual

- axe‑core checks; keyboard navigation; contrast
- Visual snapshots for core widgets/pages

## Perf & RUM

- Measure plugin load time; set thresholds per page/widget

See also: Ops Runbook `./ops-runbook`, API Reference `./api-reference`.

