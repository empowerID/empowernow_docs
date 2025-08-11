---
id: run-empowerid-workflow
title: Run an EmpowerID workflow via BFF
sidebar_label: Run EmpowerID workflow
tags: [service:bff, type:how-to, roles:developer, roles:admin]
---

Goal: execute a configured EmpowerID workflow through the BFF.

Prereqs
- Workflow defined in `ServiceConfigs/BFF/config/empowerid_endpoints.yaml` under `workflows.*`
- BFF session cookie present

Command
```bash
curl -X POST https://.../api/v1/empowerid/workflow \
  -H "Content-Type: application/json" \
  --cookie "_eid_sid=..." \
  -d '{"workflow_name":"PersonDelete","parameters":{"PersonID":"<GUID>"}}'
```

Troubleshooting
- 404: name not in catalog; check `workflows.*`
- 403: PDP deny; confirm `pdp_resource`/`pdp_action` and user permissions
- 401: BFF session missing

See also: `../reference/empowerid-direct`, `./call-empowerid-webui`


