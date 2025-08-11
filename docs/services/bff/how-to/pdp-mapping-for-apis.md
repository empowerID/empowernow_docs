---
title: PDP Mapping for New Endpoints
---

Where mappings live

- `ServiceConfigs/BFF/config/pdp.yaml` under `endpoint_map`.

Pattern (verified)

- Map `METHOD` per path to `resource`, `action`, optional `id_from`, and optional `props` that can extract `$.field` from JSON body or `{param}` from the URL.

Example

```yaml
/api/v1/users/{user_id}:
  GET:
    resource: "user"
    id_from: "{user_id}"
    action: "read"
```

How it’s applied (code‑verified)

- `PathMapperService` compiles regex from templates, extracts URL params and body fields, and returns `(resource_type, resource_id, action, props)` used by `require_permission`.

Quick validation

- Hit your endpoint; on authorization errors, check BFF logs for mapping debug lines and ensure method/path match and `id_from` resolves.


