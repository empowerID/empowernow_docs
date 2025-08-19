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
- DELETE `/api/secrets?uri=...&destroy=[true|false]`
  - YAML (dev/test only): removes fragment or node.
  - OpenBao/HashiCorp KVv2: soft delete or hard destroy via provider.
- POST `/api/secrets/rotate`
  - YAML: update semantics.
  - KVv2: uses `RotationController` to upsert new value (payload as `{fragment: value}` or full map).
- GET `/api/secrets/metadata` and `/api/secrets/keys`
  - YAML only (dev tooling) for metadata listing and key enumeration.

## Auditing
- Kafka events on read/update/delete (includes `resource_ref` HMAC when `TENANT_SALT` is set). Provider strategies emit provider‑specific audit events (e.g., KVv2 delete/destroy).

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

Delete KVv2
```bash
DELETE /api/secrets?uri=openbao+kv2://secret/app/test#value
# destroy=true for hard delete
```

Notes
- Reads for non‑YAML should happen through `VaultService` (PEP) in app code; the API’s YAML read is for dev tooling.
- Scopes/PDP can be turned on progressively with the env flags above.


