---
title: routes.yaml Reference
---

Structure

- services: container DNS and base URLs for upstreams
- routes[]:
  - id, description
  - path: client path, supports wildcard `*`
  - target_service: key from services
  - upstream_path: templated backend path, `{path}` is wildcard capture
  - methods: [GET, POST, ...]
  - auth: `session` | `bearer` | `none`
  - streaming: boolean (SSE)
  - preserve_path: boolean

Mental model

- `path` is the SPA’s client path (what your app calls under `/api/...`).
- `upstream_path` is the backend path the BFF will call; `{path}` captures the wildcard portion.

Example translation

```text
Client: GET /api/crud/forms/123
Route:  path "/api/crud/forms/*"  →  upstream_path "/forms/{path}" (target_service: crud_service)
BFF:    GET http://crud_service/forms/123
```
Auth semantics

- session: cookie‑based session check, headers injected to backend
- bearer: pass/validate bearer token per idps/audience
- none: public endpoint (e.g., health, OIDC discovery)

Canonical prefixes

- CRUD APIs are exposed under `/api/crud/**`
- AuthZEN preserved paths are proxied as-is: `/access/v1/evaluation` and `/access/v1/evaluations` (paths preserved to PDP)


