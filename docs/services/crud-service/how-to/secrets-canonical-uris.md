---
title: Canonical Secret URIs and tenant guards
description: Grammar, validation rules, error taxonomy, and tenant mount guards for secret pointers.
---

### Canonical URI grammar
- No authority; first path segment is the mount.
- Lowercase scheme/engine; case-sensitive path.
- Forbid `..`, `%2F`, duplicate slashes, empty segments; disallow mid-path `*`.
- Allow only terminal `/*` when policy allow-lists it.
- Query keys must be unique and sorted; duplicates rejected.

Examples
- Accept: `openbao+kv2://secret/jira/api#token?version=12`
- Reject: `hashicorp+kv2://secret//path`, `openbao+kv2://secret/jira/*/token`

### Visual: canonicalization and guards
```mermaid
flowchart TD
  A[Input pointer] --> B[Parse scheme/engine]
  B --> C[Split path → mount + path]
  C --> D[Normalize: lowercase scheme/engine; sort query]
  D --> E{Validate segments}
  E -->|ok| F{Wildcard allowed?}
  E -->|.., %2F, //, empty| X[Error: ILLEGAL_SEGMENT]
  F -->|mid‑path *| X2[Error: INVALID_WILDCARD]
  F -->|terminal /* ok| G[Proceed]
  G --> H{Tenant guard}
  H -->|mount ∉ allowed| X3[Error: TENANT_MOUNT_MISMATCH]
  H -->|mount ∈ allowed| I[Canonical URI]
  I --> J[Derive resource_ref (HMAC)]
```

### Error taxonomy
- `INVALID_WILDCARD`, `ILLEGAL_SEGMENT`, `TENANT_MOUNT_MISMATCH`, `UNSUPPORTED_ENGINE`, `AMBIGUOUS_MOUNT`, `AMBIGUOUS_QUERY`, `DOUBLE_MOUNT_SOURCE`, `PROVIDER_TRAILING_SLASH_MISMATCH`.

### Tenant guard
- Derive `tenant_id` from `ExecutionContext` and validate `mount` membership in an allowed list from config.
- Fail-closed on missing map or outage; metric: `tenant_mount_violation_total`.

### Identifiers
- Policy ARN: `auth:v1:resource:secret:<namespace>:<short-id>`.
- Non-leaky `resource_ref = base64url(HMAC-SHA256(tenant_salt, canonical_uri))`.

### Defaults
- `SECRET_URI_ACCEPT_LEGACY=false` (dev: true), strict parsing enabled by default.

### Copyable examples
Valid
```text
openbao+kv2://secret/app/api#token?version=12
yaml://secret/env#MY_API_KEY
```

Invalid → reason
```text
hashicorp+kv2://secret//path           # ILLEGAL_SEGMENT (empty segment)
openbao+kv2://secret/jira/*/token      # INVALID_WILDCARD (mid-path *)
openbao+kv2://secret/a%2Fb#key         # ILLEGAL_SEGMENT (%2F)
```

### HTTP error mapping
When parsing fails, responses return 400 with a typed code, for example:
```json
{"error":"Bad Request","code":"TENANT_MOUNT_MISMATCH","message":"mount not allowed for tenant"}
```


