---
title: Developer guide
description: Quick start, Canonical URIs, SDK usage, REST examples, testing, and FAQs
---

## Quick start

Prerequisites

- Configure one provider (YAML for dev, or OpenBao/HashiCorp KVv2)
- Recommended local flags:
  - `SECRETS_API_REQUIRE_AUTH=false` (default)
  - `SECRETS_ENFORCE_SCOPES=false` (default)
  - `TENANT_ID=dev`, `TENANT_ALLOWED_MOUNTS=secret`
  - For YAML: `YAML_VAULT_PATH=/app/config/data/dev_secrets.yaml`
  - For KVv2: `VAULT_URL=...`, `VAULT_TOKEN=...`

Seed a dev YAML file

- See `../how-to/yaml-vault-provider.md` for `scripts/yaml_dev_bootstrap.py` usage.

First tests

- Create (YAML dev):
```bash
curl -X POST "$BASE/api/secrets" \
  -H "Content-Type: application/json" \
  -d '{"uri":"yaml://secret/env#MY_NEW","value":"hello"}'
```

- Read value (YAML dev):
```bash
curl "$BASE/api/secrets?uri=yaml://secret/env#MY_NEW"
```

- Read value (KVv2 via PEP):
```bash
curl "$BASE/api/secrets/value?uri=openbao+kv2://secret/app/api#token"
```

## Canonical URIs

- YAML: `yaml://secret/<path>#<key>`
- OpenBao KVv2: `openbao+kv2://<mount>/<path>#<key>[?version=N]`
- HashiCorp KVv2: `hashicorp+kv2://<mount>/<path>#<key>[?version=N]`

Notes

- Guarded by `TENANT_ID` and `TENANT_ALLOWED_MOUNTS`
- With fragment → single value; without fragment → map (provider‑specific)
- Version pin (KVv2): add `?version=N` to the URI with `/api/secrets/value`
- Invalid forms return 400 with structured error details

Migrate env values to pointers

```diff
- MY_API_KEY=plaintext-value
+ MY_API_KEY_POINTER=openbao+kv2://secret/app#MY_API_KEY
```

## SDK usage (Python)

Basic usage

```python
from src.services.vault_service import VaultService

svc = VaultService(ttl=60)
value_or_map = await svc.get_credentials("openbao+kv2://secret/app/api#token")
```

Pass request context (FastAPI/Starlette)

```python
from src.models.execution_context import ExecutionContext
payload = await svc.get_credentials(uri, execution_context=ExecutionContext(request=request))
```

Return shapes

- Fragment present → returns the value under that key
- No fragment → returns a map (object) for the path

Errors (typical)

- 400 malformed URI/incompatible payload
- 401/403 when auth/scope/policy denies
- 404 when path/fragment not found
- 501 when provider/operation not supported
- 502 when provider call fails

## Provider notes

- KVv2: path `<mount>/<path>`; fragment selects key; supports soft delete/undelete/destroy versions; version pin via `?version=`
- YAML (dev only): file‑backed at `YAML_VAULT_PATH`; writes/deletes blocked outside dev/test

## Security integration

- PDP checks happen inside the PEP (VaultService/Secrets API)
- Optional scopes on endpoints: set `SECRETS_ENFORCE_SCOPES=true`
- Require auth on endpoints: set `SECRETS_API_REQUIRE_AUTH=true`
- Values are masked; audits use non‑leaky `resource_ref` when `TENANT_SALT` is set

## REST examples

Create/update

```bash
curl -X POST "$BASE/api/secrets" -H "Content-Type: application/json" -d '{"uri":"openbao+kv2://secret/app/test#value","value":{"value":"hello"}}'
```

Read (YAML dev)

```bash
curl "$BASE/api/secrets?uri=yaml://secret/env#MY_NEW"
```

Read (KVv2 via PEP) with version pin

```bash
curl "$BASE/api/secrets/value?uri=openbao+kv2://secret/app/test#value&version=2"
```

Delete / destroy

```bash
curl -X DELETE "$BASE/api/secrets?uri=openbao+kv2://secret/app/test#value"
curl -X DELETE "$BASE/api/secrets?uri=openbao+kv2://secret/app/test#value&destroy=true"
```

Rotate (KVv2)

```bash
curl -X POST "$BASE/api/secrets/rotate" -H "Content-Type: application/json" -d '{"uri":"openbao+kv2://secret/app/test#value","value":"new"}'
```

Metadata and keys (YAML dev)

```bash
curl "$BASE/api/secrets/metadata?prefix=yaml://secret/env/"
curl "$BASE/api/secrets/keys?uri=yaml://secret/env"
```

Metadata detail / versions (KVv2)

```bash
curl "$BASE/api/secrets/metadata/detail?uri=openbao+kv2://secret/app/test"
curl "$BASE/api/secrets/versions?uri=openbao+kv2://secret/app/test"
```

Undelete / destroy versions (KVv2)

```bash
curl -X POST "$BASE/api/secrets/undelete" -H "Content-Type: application/json" -d '{"uri":"openbao+kv2://secret/app/test","versions":[3,4]}'
curl -X POST "$BASE/api/secrets/destroy-versions" -H "Content-Type: application/json" -d '{"uri":"openbao+kv2://secret/app/test","versions":[1,2]}'
```

Search and bulk

```bash
curl "$BASE/api/secrets/search?q=token&prefix=yaml://secret/env/"
curl -X POST "$BASE/api/secrets/bulk" -H "Content-Type: application/json" -d '{"operations":[{"op":"set","uri":"yaml://secret/env#NEW","value":"abc"},{"op":"delete","uri":"openbao+kv2://secret/app/test#value"}]}'
```

Copy / move

```bash
curl -X POST "$BASE/api/secrets/copy" -H "Content-Type: application/json" -d '{"fromUri":"yaml://secret/env#FROM","toUri":"yaml://secret/env#TO","overwrite":false}'
curl -X POST "$BASE/api/secrets/move" -H "Content-Type: application/json" -d '{"fromUri":"yaml://secret/env#FROM","toUri":"yaml://secret/env#TO"}'
```

Events and audit (dev)

```bash
curl "$BASE/api/secrets/events"   # SSE (dev)
curl "$BASE/api/secrets/audit"    # in-memory buffer (dev)
```

See full reference: `../reference/secrets-api.md`

## Testing

- Unit: mock `VaultService` and provider strategies
- Integration: YAML provider or KVv2; exercise versioned reads and rotate
- Contract: test 200/400/401/403/404/501 for endpoints incl. `/value`, metadata/detail, versions, bulk, copy/move, search

## Dev vs prod

- YAML provider is for dev only; blocked outside dev/test
- Enable `SECRETS_API_REQUIRE_AUTH`/`SECRETS_ENFORCE_SCOPES` as needed in higher environments

## FAQs and pitfalls

- 400 malformed URI or missing fragment when required
- 403 policy denied or insufficient scope
- 404 path/fragment not found
- 501 operation not supported for provider
- Prefer `*_POINTER` envs; never log secret values


