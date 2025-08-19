---
title: Admin how‑to
description: Setup, rotate, backup/restore, version lifecycle
---

Setup

- Configure providers: `VAULT_URL`, `VAULT_TOKEN` (or AppRole), mounts
- Enable PDP: `ENABLE_AUTHORIZATION=true` with policy backend
- Set tenant guards: `TENANT_ID`, `TENANT_ALLOWED_MOUNTS`

Rotate

- Use `/api/secrets/rotate` or bulk `rotate` op; for KVv2 preferred via RotationController

Backup/restore

- KVv2 providers handle versions; YAML dev file can be backed up via config path

Version lifecycle

- Soft delete → undelete → destroy versions when needed; prefer non‑destructive operations


