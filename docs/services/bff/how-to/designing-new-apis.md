---
title: Designing New SPA API Surfaces in the BFF
---

Best practices (verified)

- Use canonical `/api/<app>/*` paths under `routes.yaml`.
- Define a `services:<name>:base_url` for the upstream.
- Add `routes:` entries with `target_service`, `upstream_path`, `methods`, and `auth: session` for protected APIs.

Example

```yaml
services:
  my_service:
    base_url: "http://my-service:8080"
    timeout: 30
routes:
  - id: "my-app-items"
    path: "/api/myapp/items/*"
    target_service: "my_service"
    upstream_path: "/items/{path}"
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    auth: "session"
```

Avoid breaking changes

- Treat `/api/...` paths as public contracts; add new routes rather than changing existing shapes.
- Maintain compatibility aliases sparingly (see `compat-execute-root`).

Validation

- After editing `routes.yaml`, verify with live requests via your SPA or curl.
- Authorization is enforced via PDP mapping (`pdp.yaml:endpoint_map`) – ensure mappings exist for new resource/actions if needed.


