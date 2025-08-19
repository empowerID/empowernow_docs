---
title: Secrets usage guide — YAML, OpenBao/HashiCorp, Canonical URIs
description: Practical, end‑to‑end guide for using Canonical Secret URIs across YAML (dev) and OpenBao/HashiCorp KVv2 (prod) with app config pointers and REST API examples.
---

## TL;DR
- Use Canonical URIs everywhere (YAML in dev, OpenBao/HashiCorp in prod):
  - YAML (dev‑only): `yaml://secret/<path>#<key>`
  - OpenBao/HashiCorp KVv2: `openbao+kv2://<mount>/<path>#<key>` or `hashicorp+kv2://...`
- App config pointers: set `CREDENTIAL_ENCRYPTION_KEY_POINTER` to the Canonical URI.
- API management: `/api/secrets` for create/read/delete/rotate. YAML is dev‑only; KVv2 supported when enabled.
- Tenant guard: set `TENANT_ID` and `TENANT_ALLOWED_MOUNTS` (e.g., `secret`).

---

## Canonical Secret URIs

Format: `[provider][+engine]://<mount>/<path>#<fragment>?key1=value1&key2=value2`

- **provider**: `yaml`, `openbao`, `hashicorp`
- **engine**: `kv2` (for OpenBao/HashiCorp KVv2). Omit for YAML.
- **mount**: first path segment (e.g., `secret`).
- **path**: remaining segments (case‑sensitive); no empty segments.
- **fragment**: the map key within the secret object (e.g., `#password`).
- **params**: optional query params. For KVv2, supports `version=<n>` on reads.

Normalization and validation (enforced by `SecretURI`):
- Lowercase `provider` and `engine`.
- Reject invalid forms: empty segments, duplicate slashes, `..`, percent‑encoded slashes, mid‑path `*`.
- Require explicit mount; no authority (no `//host`).
- Query keys must be unique and sorted when normalized.

Examples:
- YAML dev: `yaml://secret/crud#CREDENTIAL_ENCRYPTION_KEY`
- OpenBao KVv2 latest: `openbao+kv2://secret/app/test#value`
- HashiCorp KVv2 pinned version: `hashicorp+kv2://secret/payments/stripe#api_key?version=12`

Provider path mapping:
- YAML: file tree under top‑level key = mount. Path segments traverse nested dicts; fragment is the final key.
- KVv2: provider path is `<mount>/<path>`. The returned map contains keys (e.g., `{ value: "..." }`); fragment picks a key from that map.

---

## Providers

### YAML Vault (dev‑only)
- File path: set `YAML_VAULT_PATH` (e.g., `/app/config/data/dev_secrets.yaml`).
- Structure:
```yaml
secret:
  crud:
    CREDENTIAL_ENCRYPTION_KEY: test-key-123
```
- Canonical example: `yaml://secret/crud#CREDENTIAL_ENCRYPTION_KEY`
- Notes: Writes are disabled outside dev/test environments.

### OpenBao / HashiCorp (KVv2)
- Minimal env (URL+token):
  - `VAULT_URL=http://openbao:8200`
  - `VAULT_TOKEN=root` (or AppRole via ROLE_ID/SECRET_ID)
  - optional: `VAULT_TIMEOUT`, `VAULT_VERIFY_SSL`, `VAULT_POOL_SIZE`, `VAULT_TOKEN_RENEWAL_THRESHOLD`, `VAULT_MAX_CONCURRENT_OPERATIONS`
- Canonical example: `openbao+kv2://secret/crud#CREDENTIAL_ENCRYPTION_KEY`
- Versioned reads: `openbao+kv2://secret/app/test#value?version=2`
- Delete vs destroy:
  - Soft delete latest: provider records a deleted version (recoverable until destroyed)
  - Destroy all versions: permanent removal of metadata and data

---

## Application configuration pointers

Compose — YAML pointer
```yaml
environment:
  - CREDENTIAL_ENCRYPTION_KEY_POINTER=yaml://secret/crud#CREDENTIAL_ENCRYPTION_KEY
  - YAML_VAULT_PATH=/app/config/data/dev_secrets.yaml
  - TENANT_ID=dev
  - TENANT_ALLOWED_MOUNTS=secret
```

Compose — OpenBao pointer
```yaml
environment:
  - CREDENTIAL_ENCRYPTION_KEY_POINTER=openbao+kv2://secret/crud#CREDENTIAL_ENCRYPTION_KEY
  - VAULT_URL=http://openbao:8200
  - VAULT_TOKEN=root
  - TENANT_ID=dev
  - TENANT_ALLOWED_MOUNTS=secret
```

Notes:
- The application resolves the pointer at startup via `VaultService` (PEP). The plaintext is not exported as an environment variable.
- Tenant guard enforces allowed mounts based on `TENANT_ALLOWED_MOUNTS`.

---

## Managing secrets via REST API

Base router: `/api/secrets`

Security toggles (safe defaults off for dev):
- `SECRETS_API_REQUIRE_AUTH=true` to require auth
- `SECRETS_ENFORCE_SCOPES=true` to enforce scopes (`secrets.read`, `secrets.write`, `secrets.delete`, `secrets.destroy`, `secrets.rotate`, `secrets.read_metadata`)
- PDP purposes enforced: write/delete/rotate/read_metadata

Endpoints:
- Create/Update (YAML, OpenBao/HashiCorp KVv2)
```bash
POST /api/secrets
{
  "uri": "openbao+kv2://secret/app/test#value",
  "value": { "value": "hello-live" }
}
```

- Read (YAML via `/api/secrets`, all providers via VaultService callers)
```bash
GET /api/secrets?uri=yaml://secret/crud#CREDENTIAL_ENCRYPTION_KEY
```

- Delete / Destroy (KVv2 supported in providers; YAML deletes file entries)
```bash
DELETE /api/secrets?uri=openbao+kv2://secret/app/test#value          # soft
DELETE /api/secrets?uri=openbao+kv2://secret/app/test#value&destroy=true  # hard
```

- Rotate (KVv2 and YAML)
```bash
POST /api/secrets/rotate
{
  "uri": "openbao+kv2://secret/app/test#value",
  "value": { "value": "new" }
}
```

- Metadata and keys listing (YAML only – dev tooling)
```bash
GET /api/secrets/metadata?prefix=yaml://secret/crud/
GET /api/secrets/keys?uri=yaml://secret/crud
```

Provider payload expectations:
- KVv2: if a fragment is given, the body should map that fragment to a value (e.g., `{ "value": "hello" }`). Without a fragment, body must be a map of keys.
- YAML: mirrors nested mappings in the YAML file.

---

## Bootstrapping dev secrets

YAML bootstrap script (dev‑only)
```bash
python scripts/yaml_dev_bootstrap.py --out /app/config/data/dev_secrets.yaml --mount secret --prefix crud --include "CREDENTIAL_ENCRYPTION_KEY"
```

Manifest for multiple `.env` sources: `scripts/bootstrap_manifest.yaml`
```bash
python scripts/yaml_dev_bootstrap.py --manifest scripts/bootstrap_manifest.yaml --out /app/config/data/dev_secrets.yaml --mount secret --clear
```

OpenBao quick seed (dev mode, root token)
```bash
curl -H "X-Vault-Token: root" \
     -H "Content-Type: application/json" \
     -X POST http://localhost:8200/v1/secret/data/crud \
     -d '{"data": {"CREDENTIAL_ENCRYPTION_KEY": "test-bao-key-123"}}'
```

---

## Security model highlights
- PEP at `VaultService` authorizes every use (grant w/ TTL/max‑uses; sender‑binding via DPoP/mTLS where available; JTI anti‑replay).
- Audits include non‑leaky `resource_ref` (HMAC of Canonical URI), provider metadata, and decision details.
- Response wrapping support exists for providers; unwrap happens in PEP.
- YAML writes are blocked outside dev/test.

## Troubleshooting
- 501 on writes: older build or provider not enabled; redeploy with updated secrets routes.
- `Unsupported provider/engine`: check provider and `+kv2` in Canonical URI.
- `SECRET_AUTHZ_FAILED`: PDP policy or audience/binding/jti conditions not met.
- Ensure `TENANT_ALLOWED_MOUNTS` includes the mount (e.g., `secret`).


