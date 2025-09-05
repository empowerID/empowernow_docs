---
id: proxy-yaml-reference
title: YAML-driven proxy reference
sidebar_label: YAML proxy (routes.yaml)
tags: [service:bff, type:reference, roles:developer, roles:devops]
---

Source of truth: `ServiceConfigs/BFF/config/routes.yaml` (mounted to `/app/config`).

What it defines
- Service entries and upstreams
- Route entries with: `id`, `path`, `target_service`, `upstream_path`, `methods`, `auth` (`none|session|bearer`), `streaming`, `preserve_path`, `authz` (`none|pdp`), optional inline `authz_map`

Usage from SPA
- Call `/api/...` on the BFF domain. Example:
```ts
await apiClient.post('/api/crud/execute', { system: 'ad', object_type: 'user', action: 'create', params: { samAccountName: 'ada' } });
```

Mental model

- `path` is what the SPA calls under `/api/...`; the BFF translates it to an upstream by applying `upstream_path` and the service `base_url`.

Example

```text
GET /api/crud/forms/123  →  BFF → GET http://crud_service/forms/123
```

AuthZEN (PDP) preserved-path examples

```yaml
# POST /access/v1/evaluation (single)
- id: "pdp-authzen-evaluation"
  path: "/access/v1/evaluation*"
  target_service: "pdp_service"
  methods: ["POST", "OPTIONS"]
  preserve_path: true

# POST /access/v1/evaluations (batch)
- id: "pdp-authzen-evaluations"
  path: "/access/v1/evaluations*"
  target_service: "pdp_service"
  methods: ["POST", "OPTIONS"]
  preserve_path: true
```

Inline PDP mapping on routes

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

Examples of families
- `/api/crud/forms*`, `/api/crud/workflows*`, `/api/tasks/*`, `/api/commands/*`, `/api/introspection/*`, `/api/agents/*`, `/api/nodes/*`, `/api/v1/analytics/*`

Auth semantics
- `auth: session` → requires BFF session
- `auth: bearer` → validates presented bearer token per `idps.yaml`
- `auth: none` → public

Authorization semantics

- `authz: pdp` enables per-request authorization via PDP
- Define per-method mapping with `authz_map` or rely on legacy `pdp.yaml` until migrated

See also: `../how-to/bff-config-routing`, `./routes-reference`, `./pdp-mapping`


