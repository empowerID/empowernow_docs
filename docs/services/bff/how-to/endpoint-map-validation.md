---
title: Validate endpoint_map entries (Quick Checklist)
---

Where: `ServiceConfigs/BFF/config/pdp.yaml` under `endpoint_map`.

Checklist

- Path pattern matches your route (`/api/...`) and method (GET/POST/etc.)
- `resource` and `action` set; `id_from` extracts `{param}` if needed
- `props` extract `$.field` from JSON body only for POST/PUT/PATCH

Test quickly

1) Call the endpoint with a sample request
2) Check BFF logs for mapping debug lines from `PathMapperService` (resource/id/action/props)
3) Ensure a PDP decision occurs; adjust mapping if resource/action are blank


