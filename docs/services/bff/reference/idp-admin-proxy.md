---
id: idp-admin-proxy
title: IdP admin proxy
sidebar_label: IdP admin proxy
tags: [service:bff, type:reference, roles:admin, roles:devops]
---

Purpose: route IdP admin API calls through the BFF with session enforcement and token injection.

- Code: `ms_bff_spike/ms_bff/src/api/v1/endpoints/idp_admin_proxy.py`

Auth: BFF session cookie required; least‑privilege roles must be enforced by IdP. Optional PDP gating via `pdp.yaml` endpoint_map.

Endpoint
- `/api/v1/admin/{path}` → IdP `/api/admin/{path}`

Example
```bash
curl "https://.../api/v1/admin/health" --cookie "_eid_sid=..."
```

Risks & mitigations
- Powerful operations: ensure role/claims checks on IdP; consider PDP mapping for sensitive actions
- Audit: capture admin calls via Kafka audit topic and logs

See also: `../how-to/secure-idp-admin-proxy`, `./pdp-mapping`


