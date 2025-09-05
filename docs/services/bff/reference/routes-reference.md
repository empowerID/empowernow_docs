## Budgets

```yaml
- id: "authzen-effective-budgets"
  path: "/access/v1/budgets/effective"
  target_service: "pdp_service"
  upstream_path: "/access/v1/budgets/effective"
  methods: ["GET", "OPTIONS"]
  auth: "session"
  preserve_path: true
  authz: "none"
```

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
  - authz: `none` | `pdp`
  - authz_map: optional per-method map for PDP (`GET`/`POST`/... → resource/action)
  - streaming: boolean (SSE)
  - preserve_path: boolean
  - internal: optional boolean; when true, dispatches to internal handlers (no HTTP loopback)

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

Inline PDP mapping examples

```yaml
- id: "crud-tasks-exact"
  path: "/api/crud/tasks"
  target_service: "crud_service"
  upstream_path: "/tasks"
  methods: ["GET", "POST"]
  auth: "session"
  authz: "pdp"
  authz_map:
    GET:
      resource: "task_list"
      action: "read"
    POST:
      resource: "task"
      action: "create"
```

Resolver precedence

- Inline `authz_map` → external `pdp.yaml:endpoint_map` (legacy) → derived defaults (if enabled)

Internal routes

- Set `target_service: internal` and optionally `internal: true` for FastAPI handlers within the BFF. Keep Experience endpoints `auth: session` so cookies/CSRF apply.


