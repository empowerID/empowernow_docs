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

Auth semantics

- session: cookie‑based session check, headers injected to backend
- bearer: pass/validate bearer token per idps/audience
- none: public endpoint (e.g., health, OIDC discovery)

Canonical prefixes

- CRUD APIs are exposed under `/api/crud/**`
- AuthZEN preserved path `/access/v1/evaluation`


