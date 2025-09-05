---
id: pdp-mapping
title: PDP endpoint mapping (legacy)
sidebar_label: PDP mapping (legacy)
tags: [service:bff, type:reference, roles:developer, roles:auditors]
---

Purpose: map API paths/methods to `resource`/`action` with optional id extraction to build PDP context.

- Preferred: define inline `authz_map` per route in `routes.yaml`.
- Legacy external config (supported during migration): `ServiceConfigs/BFF/config/pdp.yaml` → `endpoint_map`.

Structure example (legacy external)
```yaml
endpoint_map:
  /api/crud/workflow/start:
    POST:
      resource: "workflow"
      action: "execute"
      props:
        workflow_name: "$.workflow_name"

  /api/crud/workflow/status/{execution_id}:
    GET:
      resource: "workflow_execution"
      id_from: "{execution_id}"
      action: "read"
```

Checklist
- Path must match exactly (with placeholders) and method must be present
- Use `id_from` for `{path}` params; use `props` with JSONPath (`$.field`) for body extracts

Migration helper

```bash
python -m ms_bff.src.tools.migrate_pdp_to_routes \
  --routes ServiceConfigs/BFF/config/routes.yaml \
  --pdp ServiceConfigs/BFF/config/pdp.yaml \
  --out ServiceConfigs/BFF/config/routes.migrated.yaml
```

Validation quick-test
- Send a request and confirm PDP decision logs and metrics increment; 403 means mapping missing or deny

See also: `../how-to/bff-config-routing`, `./routes-reference`


