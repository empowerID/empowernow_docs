---
id: proxy-yaml-reference
title: YAML-driven proxy reference
sidebar_label: YAML proxy (routes.yaml)
tags: [service:bff, type:reference, roles:developer, roles:devops]
---

Source of truth: `ServiceConfigs/BFF/config/routes.yaml` (mounted to `/app/config`).

What it defines
- Service entries and upstreams
- Route entries with: `id`, `path`, `target_service`, `upstream_path`, `methods`, `auth` (`none|session`), `streaming`, `preserve_path`

Usage from SPA
- Call `/api/...` on the BFF domain. Example:
```ts
await apiClient.post('/api/crud/execute', { system: 'ad', object_type: 'user', action: 'create', params: { samAccountName: 'ada' } });
```

Examples of families
- `/api/crud/forms*`, `/api/crud/workflows*`, `/api/tasks/*`, `/api/commands/*`, `/api/introspection/*`, `/api/agents/*`, `/api/nodes/*`, `/api/v1/analytics/*`

Auth semantics
- `auth: session` → requires BFF session
- `auth: none` → public

See also: `./pdp-mapping`, `../how-to/designing-new-apis`, `../reference/routes-reference`


