---
title: Secrets PDP enrichment
description: Exact subject, resource, purpose, and context fields sent to the PDP for secrets decisions
slug: pdp-enrichment
---

## Secrets PDP Enrichment: Subject, Resource, Action, Context

This document describes exactly what we send to the PDP for authorization decisions in the secrets engine, with code-backed details and concrete examples.

### Where the PDP call happens

- Provider-enforced reads (PEP): `VaultService.get_credentials(...)` calls `SecretPolicyService.authorize_use(...)` with purpose `execute` and an enriched context before any provider access.
- Admin/CRUD operations (API): `src/api/secrets_routes.py` guards write, delete, rotate, versions, etc., by calling `SecretPolicyService.authorize_batch(...)` with a purpose specific to the endpoint (e.g., `write`, `delete`, `rotate`, `read_metadata`, `destroy_versions`, `undelete`, `owner_update`).

### What we send (fields)

#### Subject
- `subject_arn`: Extracted from `request.state.subject`. If missing, defaults to `anonymous`.

#### Action (purpose)
- PEP read path (provider-backed): purpose is `execute`.
- API routes purposes:
  - Create/Update: `write`
  - Delete (soft): `delete`
  - Destroy versions (hard): `destroy_versions`
  - Undelete versions: `undelete`
  - Rotate: `rotate`
  - Metadata listing/detail/search/keys/versions: `read_metadata`
  - Owner update: `owner_update`

#### Resource
- `canonical_uri`: The Canonical Secret URI (e.g., `openbao+kv2://secret/app/api#token` or without fragment for path-level operations).
- Tenant guard ensures the mount is allowed (`TENANT_ALLOWED_MOUNTS`).

#### Context (enriched)
For provider-backed reads (PEP in `VaultService`), we send:
- `issuer`: `request.state.issuer`
- `client_id`: `request.state.client_id` (or `azp`)
- `aud`: `request.state.aud` (list/string); we also enforce that it includes `SECRETS_AUDIENCE` at the PEP layer when present
- `token_jti`: `request.state.token_jti` (for anti-replay)
- `correlation_id`: `request.state.correlation_id`
- `workflow_run_id`: `request.state.workflow_run_id`
- `node_id`: `request.state.node_id`
- `system_id`: `request.state.system_id`
- `resource_attributes`: owner and provenance attributes when available (see below)

Sender-binding (if available):
- `cnf_binding`: extracted as either DPoP `jkt` (`request.state.cnf_jkt`) or mTLS thumbprint (`request.state.mtls_thumbprint`). This value is bound to the grant and enforced for drift.

Resource attributes (KVv2 custom metadata):
- From provider metadata read, we attach:
  - `owner`: mutable owner ARN
  - `created_by`: immutable creator ARN
  - `created_at`: ISO timestamp

These are automatically stamped on first write/rotation for KVv2 providers and fetched during PEP evaluation.

### Code references

- PEP: Context build and PDP call (execute):
  ```391:413:CRUDService/src/services/vault_service.py
  pdp_context = {
    "issuer": issuer,
    "client_id": client_id,
    "aud": audiences,
    "token_jti": token_jti,
    "correlation_id": correlation_id,
    "workflow_run_id": workflow_run_id,
    "node_id": node_id,
    "system_id": system_id,
  }
  # resource_attributes added if present
  grant = await self._policy.authorize_use(subject_arn or "anonymous", tenant_id, canonical_uri, "execute", cnf_binding, context=pdp_context)
  ```

- Resource attributes enrichment (metadata → context.resource_attributes):
  ```401:413:CRUDService/src/services/vault_service.py
  meta = await strat.read_secret_metadata(path_only)
  custom = (meta or {}).get("custom_metadata", {})
  pdp_context["resource_attributes"] = {k: v for k, v in custom.items() if k in {"owner","created_by","created_at"}}
  ```

- Purpose mapping on API routes:
  - Create/Update (write):
    ```156:163:CRUDService/src/api/secrets_routes.py
    grants, failures = await svc.authorize_batch(..., purpose="write")
    ```
  - Delete/Destroy/Undelete:
    ```380:395,1315:1322,1267:1274:CRUDService/src/api/secrets_routes.py
    purpose="delete" | "destroy_versions" | "undelete"
    ```
  - Rotate:
    ```1112:1119:CRUDService/src/api/secrets_routes.py
    purpose="rotate"
    ```
  - Metadata (list/detail/search/keys/versions):
    ```491:496,545:552,601:609,1075:1081,1225:1227:CRUDService/src/api/secrets_routes.py
    purpose="read_metadata"
    ```
  - Owner update:
    ```...:CRUDService/src/api/secrets_routes.py
    purpose="owner_update"
    ```

### Example payloads

#### 1) Provider-backed read (PEP) of a fragment

Request: `GET /api/secrets/value?uri=openbao+kv2://secret/app/api#token`

PDP input (conceptual):
```json
{
  "subject_arn": "auth:account:idp:alice",
  "tenant_id": "acme",
  "canonical_uri": "openbao+kv2://secret/app/api#token",
  "purpose": "execute",
  "cnf_binding": "dp0p-jkt-sha256...",
  "context": {
    "issuer": "https://idp.example.com/api/oidc",
    "client_id": "spa-client",
    "aud": ["crud.secrets"],
    "token_jti": "af2d...",
    "correlation_id": "6c0d...",
    "workflow_run_id": null,
    "node_id": null,
    "system_id": null,
    "resource_attributes": {
      "owner": "auth:account:idp:platform-team",
      "created_by": "auth:account:idp:alice",
      "created_at": "2025-01-25T12:34:56Z"
    }
  }
}
```

#### 2) Rotate a secret value (KVv2)

Request: `POST /api/secrets/rotate { uri, value }`

PDP input (conceptual):
```json
{
  "subject_arn": "auth:account:idp:bob",
  "tenant_id": "dev",
  "canonical_uri": "openbao+kv2://secret/app/api#token",
  "purpose": "rotate"
}
```

#### 3) Update owner metadata

Request: `POST /api/secrets/metadata/owner { uri: "openbao+kv2://secret/app/api", owner: "auth:account:idp:data-team" }`

PDP input (conceptual):
```json
{
  "subject_arn": "auth:account:idp:admin",
  "tenant_id": "acme",
  "canonical_uri": "openbao+kv2://secret/app/api",
  "purpose": "owner_update"
}
```

### Security notes

- Audience check at the PEP enforces that `aud` includes `SECRETS_AUDIENCE` when present.
- Anti-replay: `token_jti` is checked in the grant cache; replays are denied.
- Sender-binding drift: if the `cnf_binding` differs mid‑TTL, further uses are denied.
- Resource attributes (owner/created_by/created_at) are fetched server-side from the provider to avoid trusting client-provided metadata.

---

See also:

- Authorization model overview: `./11-authorization-model-authzen.md`
- API reference (purposes and scopes): `./09-api-reference.md`


