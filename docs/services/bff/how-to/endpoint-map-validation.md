---
title: Validate PDP mappings (inline and legacy)
---

Where:

- Preferred: inline per-route `authz_map` in `ServiceConfigs/BFF/config/routes.yaml`.
- Legacy: `ServiceConfigs/BFF/config/pdp.yaml` under `endpoint_map` (during migration).

Checklist (inline `authz_map`)

- Route has `authz: pdp` and an `authz_map` entry for each method you protect
- Each method maps to `resource` and `action`; optional `id_from` and `props` supported
- For wildcards, ensure mapping covers the method and that any required `id_from` is available via path or body

Checklist (legacy `endpoint_map`)

- Path pattern matches your route (`/api/...`) and method (GET/POST/etc.)
- `resource` and `action` set; `id_from` extracts `{param}` if needed
- `props` extract `$.field` from JSON body only for POST/PUT/PATCH

Test quickly

1) Call the endpoint with a sample request
2) Check BFF logs for mapping debug lines from the resolver (resource/id/action/props)
3) Ensure a PDP decision occurs; adjust mapping if resource/action are blank


