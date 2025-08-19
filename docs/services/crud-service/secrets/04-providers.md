---
title: Providers
description: OpenBao/HashiCorp KVv2 and YAML dev provider
---

KVv2 Providers (OpenBao / HashiCorp)

- Path: `<mount>/<path>`; fragments address keys in the KV map
- Versioning: `?version=N` reads specific versions
- Ops: soft delete, undelete, destroy versions
- Auth: token or AppRole; configure via `VAULT_URL`, `VAULT_TOKEN`, etc.

YAML Provider (dev only)

Provider trust and credentials (CISO)

- Root of trust in provider; access via least‑privilege policies per mount
- Credentials stored via secure secret management; never committed to code

Enablement steps (Admin)

1) Configure provider URL/creds (VAULT_URL, VAULT_TOKEN/AppRole)
2) Define mounts and policies for app paths
3) Set TENANT_ID and TENANT_ALLOWED_MOUNTS
4) Enable PDP authorization and (optionally) scopes
5) Validate health, metrics, and sample reads/writes

CLI examples

```bash
# KVv2 write (OpenBao/HashiCorp)
vault kv put secret/app/api token=abc

# Read a version
vault kv get -version=2 secret/app/api
```

QA notes

- Mock strategy or record/replay for provider calls
- Edge cases: missing metadata, soft‑deleted keys, 404 vs 403 mapping

- File‑backed using the same URIs and PEP seams
- Writes/deletes blocked outside dev/test
- Config: `YAML_VAULT_PATH`


