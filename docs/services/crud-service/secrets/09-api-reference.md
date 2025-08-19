---
title: API reference
description: Secrets API endpoints, scopes, purposes, and examples
---

See also: `../reference/secrets-api.md` for a consolidated reference.

## Endpoint catalog and purposes

Each endpoint uses Canonical Secret URIs (e.g., `openbao+kv2://secret/app/api#token`). PDP purposes and optional OAuth scopes are noted; see IdP requirements below.

- Create/update — POST `/api/secrets`
  - Purpose: `write`
  - Scope (optional when enabled): `secrets.write`
  - Body: `{ "uri": "<canonical>", "value": <objectOrScalar> }`
  - YAML (dev): writes file; KVv2: upserts map or fragment value

- Read (YAML dev) — GET `/api/secrets?uri=...`
  - Purpose: (YAML dev only)
  - Scope: `secrets.read`
  - Returns object (no fragment) or `{ "value": <scalarOrObject> }` when fragment present

- Read (provider‑backed) — GET `/api/secrets/value?uri=...[&version=N]`
  - Purpose: enforced inside PEP (`VaultService.get_credentials`)
  - Scope: `secrets.read`
  - Supports KVv2 version pin via `version=` query

- Delete / Destroy — DELETE `/api/secrets?uri=...&destroy=[true|false]`
  - Purpose: `delete` (soft) or `destroy_versions` (when `destroy=true`)
  - Scopes: `secrets.delete` or `secrets.destroy`

- Rotate — POST `/api/secrets/rotate`
  - Purpose: `rotate`
  - Scope: `secrets.rotate`
  - Body: `{ "uri": "<canonical>", "value": <objectOrScalar> }` (KVv2 writes new version)

- Metadata listing (YAML dev) — GET `/api/secrets/metadata?prefix=...`, `/keys?uri=...`
  - Purpose: `read_metadata`
  - Scope: `secrets.read_metadata`

- Metadata detail / Versions (KVv2) — GET `/api/secrets/metadata/detail?uri=...`, `/versions?uri=...`
  - Purpose: `read_metadata`
  - Scope: `secrets.read_metadata`

- Undelete / Destroy versions (KVv2) — POST `/api/secrets/undelete`, `/destroy-versions`
  - Purposes: `undelete`, `destroy_versions`
  - Scopes: `secrets.delete`, `secrets.destroy`
  - Body: `{ "uri": "<canonicalPathNoFragment>", "versions": [N,...] }`

- Update owner metadata (KVv2) — POST `/api/secrets/metadata/owner`
  - Purpose: `owner_update`
  - Scope: `secrets.set_owner`
  - Body: `{ "uri": "<canonicalPathNoFragment>", "owner": "<subjectOrGroup>" }`
  - Preserves `created_by` and `created_at`; updates `owner`

- Bulk operations — POST `/api/secrets/bulk`
  - Purpose: per operation (`set|delete|undelete|destroy|rotate`)
  - Scope: per operation (as above)

- Copy / Move — POST `/api/secrets/copy`, `/api/secrets/move`
  - Purpose: read on source + write on destination
  - Scopes: `secrets.read` + `secrets.write`

- Search (YAML dev; KVv2 when supported) — GET `/api/secrets/search?q=...&prefix=...`
  - Purpose: `read_metadata`
  - Scope: `secrets.read_metadata`

- Events / Audit (dev) — GET `/api/secrets/events`, `/api/secrets/audit`
  - Dev helpers (SSE stream and in‑memory ring buffer). Hide/disable in prod.

Scopes (optional) and PDP purposes are listed per endpoint in the reference page.

Compliance signals (CISO)

- Audit fields: `subject`, `purpose`, `effect`, `resource_ref`, `decision_id`

Operational limits (Admin)

- Timeouts/retries per provider operation; 429/503 semantics on overload
- Pagination defaults: listing/search limit 100 (configurable)
- Concurrency caps documented in Admin how‑to

QA edge cases to exercise

- Undelete/destroy with empty versions, version pin reads, prefix search traversal

## IdP and authorization requirements

Endpoint auth is off by default for local development. In higher environments enable:

- `SECRETS_API_REQUIRE_AUTH=true` — require session/bearer on `/api/secrets/*`
- `SECRETS_ENFORCE_SCOPES=true` — enforce endpoint scopes
- `SECRETS_AUDIENCE=crud.secrets` (default) — audience check when `aud` is present in tokens

Expected OAuth scopes (configure in your IdP):

- `secrets.read`, `secrets.write`, `secrets.delete`, `secrets.destroy`, `secrets.rotate`, `secrets.read_metadata`
- `secrets.set_owner` (for POST `/api/secrets/metadata/owner`)

IdP/client configuration (example):

- Add the audience (e.g., `crud.secrets`) to the scope‑to‑audience mapping so the IdP issues tokens usable by the secrets API
- Ensure the client that calls the API (BFF/service/CI) has the allowed audiences including `crud.secrets`
- Grant only the scopes needed for the operations invoked (least privilege)

PDP purposes (enforced by PEP/PDP):

- `write`, `read`, `delete`, `rotate`, `read_metadata`, `undelete`, `destroy_versions`
- `owner_update` (for POST `/api/secrets/metadata/owner`)

Notes:

- Provider‑backed reads invoked by application code use `VaultService.get_credentials(...)`; the PEP calls the PDP and enforces decisions and obligations.
- YAML provider writes/deletes are blocked when `ENVIRONMENT` is not dev/test.
 - On first KVv2 write/rotate, the API/plugin best‑effort stamps custom metadata: `created_by` (immutable), `created_at` (ISO UTC), and `owner` (mutable; defaults to subject when available). Providers expose `custom_metadata` via metadata detail.


