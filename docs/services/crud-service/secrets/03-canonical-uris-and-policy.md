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

Default‑deny posture and lifecycle

- Policies default to deny unless explicitly allowed for purpose
- Owners: Security approves policy changes; periodic reviews (quarterly)

Examples and migration

- With fragment: `openbao+kv2://secret/app/api#token`
- Without fragment (path object): `openbao+kv2://secret/app/api`
- Version pin: `...?version=3`
- Migration: ENV var `MY_KEY` → pointer `MY_KEY_POINTER=openbao+kv2://secret/app#MY_KEY`

Common mistakes

- Missing fragment when provider expects KV map → 400
- Wrong mount (not in TENANT_ALLOWED_MOUNTS) → 400
- Using YAML in prod → blocked by environment guard

Test matrix (QA)

- Valid/invalid URI forms; fuzz path/fragment; ensure normalization is idempotent
- Purposes map to expected provider actions and responses


