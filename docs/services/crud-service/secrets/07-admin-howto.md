---
title: Admin how‑to
description: Setup, rotate, backup/restore, version lifecycle
---

Setup

- Configure providers: `VAULT_URL`, `VAULT_TOKEN` (or AppRole), mounts
- Enable PDP: `ENABLE_AUTHORIZATION=true` with policy backend
- Set tenant guards: `TENANT_ID`, `TENANT_ALLOWED_MOUNTS`

Procedures

- Initial setup
  1. Set provider env vars and create KVv2 mount/policy
  2. Set TENANT_* and enable PDP/scopes
  3. Deploy and verify health/metrics
  4. Create sample secret and read via Canonical URI
- Rotation playbook
  1. Approve change (ticket) → execute `/api/secrets/rotate` or bulk `rotate`
  2. Verify provider version increment, app reads new value, audits emitted
  3. Rollback: rotate back to prior version
- Backup/restore (KVv2)
  - Use provider snapshots or export metadata; test restore to staging
- Disaster recovery
  - Promote standby provider; re-point VAULT_URL; verify policies and mounts
- Access control setup
  - Least-privilege policies per mount and app; rotate provider creds regularly

Verification

- Health endpoints OK, metrics present, audit events seen in Kafka
- Sample cURL reads/writes succeed and match policy

Version lifecycle

- Soft delete → undelete; destroy versions only with approval and evidence capture


