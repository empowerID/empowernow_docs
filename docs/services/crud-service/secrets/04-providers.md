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

- File‑backed using the same URIs and PEP seams
- Writes/deletes blocked outside dev/test
- Config: `YAML_VAULT_PATH`


