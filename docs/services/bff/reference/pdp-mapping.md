---
id: pdp-mapping
title: PDP endpoint mapping
sidebar_label: PDP mapping (pdp.yaml)
tags: [service:bff, type:reference, roles:developer, roles:auditors]
---

Purpose: map API paths/methods to `resource`/`action` with optional id extraction to build PDP context.

- Config: `ServiceConfigs/BFF/config/pdp.yaml` → `endpoint_map`

Structure example
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

Validation quick-test
- Send a request and confirm PDP decision logs and metrics increment; 403 means mapping missing or deny

See also: `../how-to/pdp-mapping-for-apis`, `./routes-reference`


