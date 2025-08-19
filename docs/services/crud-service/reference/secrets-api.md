---
title: Secrets API reference
description: Endpoints, auth/scopes, provider behaviors, auditing, and compose examples for `/api/secrets`.
---

## What the Secrets API does
- Path: `/api/secrets` (+ `/metadata`, `/keys`, `/rotate`)
- Input: Canonical Secret URI (strictly parsed/normalized; tenant/mount guarded)
  - YAML: `yaml://secret/<path>#<key>`
  - OpenBao/HashiCorp KVv2: `openbao+kv2://<mount>/<path>#<key>[?version=N]`, `hashicorp+kv2://...`

## Authentication and authorization
- Auth dependency is optional; enable with `SECRETS_API_REQUIRE_AUTH=true` (uses `AuthenticationService`).
- OAuth scopes optional; enable with `SECRETS_ENFORCE_SCOPES=true`.
  - POST write: `secrets.write`
  - DELETE soft: `secrets.delete`; hard destroy: `secrets.destroy`
  - POST /rotate: `secrets.rotate`
  - GET /metadata|/keys: `secrets.read_metadata`
  - GET read (YAML): `secrets.read`
- PDP enforced via `SecretPolicyService.authorize_batch`:
  - Purposes: `write`, `delete`, `rotate`, `read_metadata` (structured 403 with details on failure)
- Tenant guard: `TENANT_ID`, `TENANT_ALLOWED_MOUNTS` (e.g., `secret`) constrain URIs.

## Endpoints and provider behavior
- POST `/api/secrets` (create/update)
  - YAML (dev/test only): writes nested map or fragment into `YAML_VAULT_PATH`.
  - OpenBao/HashiCorp KVv2: requires engine `kv2`; resolves provider via strategies; writes map, or `{fragment: value}` if `#fragment` present.
- GET `/api/secrets?uri=...`
  - YAML only (dev tooling): returns map or fragment value; non‑YAML returns 501 (use VaultService for reads).
- GET `/api/secrets/value?uri=...[&version=N]`
  - Provider‑backed read through `VaultService` (PEP). Supports KVv2 version pin query.
- DELETE `/api/secrets?uri=...&destroy=[true|false]`
  - YAML (dev/test only): removes fragment or node.
  - OpenBao/HashiCorp KVv2: soft delete or hard destroy via provider.
- POST `/api/secrets/rotate`
  - YAML: update semantics.
  - KVv2: uses `RotationController` to upsert new value (payload as `{fragment: value}` or full map).
- GET `/api/secrets/metadata?prefix=...` and `/api/secrets/keys?uri=...`
  - YAML only (dev tooling) for metadata listing and key enumeration.
- GET `/api/secrets/metadata/detail?uri=...`
  - KVv2 provider metadata (versions and custom metadata) for a given path.
- GET `/api/secrets/versions?uri=...`
  - KVv2 versions listing for a given path.
- GET `/api/secrets/search?q=...&prefix=...`
  - YAML search by path/fragment. KVv2 shallow traversal when provider supports `list_keys`.
- POST `/api/secrets/undelete`
  - KVv2 undelete specific versions.
- POST `/api/secrets/destroy-versions`
  - KVv2 hard‑destroy specific versions (irreversible).
- POST `/api/secrets/bulk`
  - Batch set|delete|destroy|undelete|rotate operations with per‑op PDP/scope enforcement.
- POST `/api/secrets/copy` and `/api/secrets/move`
  - Copy/move secrets between URIs. PDP: read on source, write on destination. `overwrite` guard.
- GET `/api/secrets/events` (SSE)
  - Server‑sent events stream for local dev tooling (reads/updates/deletes).
- GET `/api/secrets/audit`
  - In‑memory audit buffer (local/dev); filterable and paginated.

## Auditing
- Kafka events on read/update/delete (includes `resource_ref` HMAC when `TENANT_SALT` is set). Provider strategies emit provider‑specific audit events (e.g., KVv2 delete/destroy). Local dev also exposes SSE `/events` and an in‑memory `/audit` buffer.

## Endpoint → scopes and PDP purposes
- POST `/api/secrets` → scope `secrets.write` (optional) | PDP purpose `write`
- GET `/api/secrets` (YAML only) → scope `secrets.read` (optional)
- GET `/api/secrets/value` → scope `secrets.read` (optional) | PDP via `VaultService`
- DELETE `/api/secrets` → scopes `secrets.delete` or `secrets.destroy` | PDP purpose `delete`
- POST `/api/secrets/rotate` → scope `secrets.rotate` | PDP purpose `rotate`
- GET `/api/secrets/metadata`, `/keys` → scope `secrets.read_metadata` | PDP purpose `read_metadata`
- GET `/api/secrets/metadata/detail`, `/versions` → scope `secrets.read_metadata` | PDP purpose `read_metadata`
- POST `/api/secrets/undelete` → scope `secrets.delete` | PDP purpose `undelete`
- POST `/api/secrets/destroy-versions` → scope `secrets.destroy` | PDP purpose `destroy_versions`
- POST `/api/secrets/bulk` → per‑op scopes and PDP purposes as above
- POST `/api/secrets/copy` → scopes `secrets.read` + `secrets.write` | PDP read on source, write on destination
- POST `/api/secrets/move` → same as copy, then delete source (soft)

## How Vault providers integrate
- YAML provider (dev‑only):
  - File‑backed; path maps to nested YAML dicts; fragment is the key.
  - Writes/deletes blocked outside dev/test (`ENVIRONMENT` guard).
- OpenBao/HashiCorp providers (KVv2):
  - Config via `VAULT_URL`, `VAULT_TOKEN` (or AppRole). Other `VAULT_*` vars optional (defaults applied).
  - Path is `<mount>/<path>`; fragment selects a key from KV payload.
  - Versioned reads supported with `?version=N`.

## Using in compose (examples)
YAML pointer
```yaml
environment:
  - CREDENTIAL_ENCRYPTION_KEY_POINTER=yaml://secret/crud#CREDENTIAL_ENCRYPTION_KEY
  - YAML_VAULT_PATH=/app/config/data/dev_secrets.yaml
  - TENANT_ID=dev
  - TENANT_ALLOWED_MOUNTS=secret
```

OpenBao pointer
```yaml
environment:
  - CREDENTIAL_ENCRYPTION_KEY_POINTER=openbao+kv2://secret/crud#CREDENTIAL_ENCRYPTION_KEY
  - VAULT_URL=http://openbao:8200
  - VAULT_TOKEN=root
  - TENANT_ID=dev
  - TENANT_ALLOWED_MOUNTS=secret
```

## Minimal API examples
Create/update KVv2
```bash
POST /api/secrets
{ "uri": "openbao+kv2://secret/app/test#value", "value": { "value": "hello" } }
```

Read YAML
```bash
GET /api/secrets?uri=yaml://secret/crud#CREDENTIAL_ENCRYPTION_KEY
```

Read KVv2 via PEP
```bash
GET /api/secrets/value?uri=openbao+kv2://secret/app/test#value&version=2
```

Delete KVv2
```bash
DELETE /api/secrets?uri=openbao+kv2://secret/app/test#value
# destroy=true for hard delete
```

Undelete versions (KVv2)
```bash
POST /api/secrets/undelete
{ "uri": "openbao+kv2://secret/app/test", "versions": [3,4] }
```

Destroy versions (KVv2)
```bash
POST /api/secrets/destroy-versions
{ "uri": "openbao+kv2://secret/app/test", "versions": [1,2] }
```

Bulk operations
```bash
POST /api/secrets/bulk
{ "operations": [
  { "op": "set", "uri": "yaml://secret/env#NEW", "value": "abc" },
  { "op": "delete", "uri": "openbao+kv2://secret/app/test#value" }
]}
```

Copy
```bash
POST /api/secrets/copy
{ "fromUri": "yaml://secret/env#FROM", "toUri": "yaml://secret/env#TO", "overwrite": false }
```

Search
```bash
GET /api/secrets/search?q=token&prefix=yaml://secret/env/
```

Notes
- Reads for non‑YAML should happen through `VaultService` (PEP) in app code; the API’s YAML read is for dev tooling.
- Scopes/PDP can be turned on progressively with the env flags above.


