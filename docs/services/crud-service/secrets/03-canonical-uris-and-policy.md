---
title: Canonical URIs and policy model
description: URI schemes, tenant guards, resource refs, and PDP purposes
---

Canonical Secret URIs

- YAML: `yaml://secret/<path>#<key>`
- OpenBao KVv2: `openbao+kv2://<mount>/<path>#<key>[?version=N]`
- HashiCorp KVv2: `hashicorp+kv2://<mount>/<path>#<key>[?version=N]`

Guards

- Tenant guard: `TENANT_ID`, `TENANT_ALLOWED_MOUNTS`
- Normalization strips ambiguous forms; invalid URIs yield structured errors

Policy model

- Purposes: `read`, `write`, `delete`, `undelete`, `destroy_versions`, `rotate`, `read_metadata`
- Batch authorization with mixed required/optional sets
- Obligations: TTL, max uses, binding hints

Resource references

- `resource_ref = HMAC(tenant_salt, canonical_uri)` used in audits (non‑leaky)


