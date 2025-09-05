---
title: PDP Mapping for New Endpoints (inline preferred)
---

Where mappings live

- Preferred: inline per-route `authz_map` in `ServiceConfigs/BFF/config/routes.yaml` with `authz: pdp`.
- Legacy: external `ServiceConfigs/BFF/config/pdp.yaml:endpoint_map` (supported during migration).

Pattern (verified)

- Map `METHOD` per path to `resource`, `action`, optional `id_from`, and optional `props` that can extract `$.field` from JSON body or `{param}` from the URL.

Example (inline on route)

```yaml
- id: "users-read"
  path: "/api/v1/users/{user_id}"
  target_service: "membership"
  upstream_path: "/v1/users/{user_id}"
  methods: ["GET"]
  auth: "session"
  authz: "pdp"
  authz_map:
    GET:
      resource: "user"
      id_from: "{user_id}"
      action: "read"
```

Legacy external mapping (for migration)

```yaml
/api/v1/users/{user_id}:
  GET:
    resource: "user"
    id_from: "{user_id}"
    action: "read"
```

How it’s applied (code‑verified)

- The resolver first checks for inline `authz_map` on the matched route. If absent, `PathMapperService` compiles regex from templates in `pdp.yaml`, extracts URL params and body fields, and returns `(resource_type, resource_id, action, props)` used by `require_permission`.

Quick validation

- Hit your endpoint; on authorization errors, check BFF logs for mapping debug lines and ensure method/path match and `id_from` resolves.


