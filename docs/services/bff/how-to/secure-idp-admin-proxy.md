---
id: secure-idp-admin-proxy
title: Secure the IdP admin proxy
sidebar_label: Secure IdP admin proxy
tags: [service:bff, type:how-to, roles:admin, roles:security]
---

Goal: harden `/api/v1/admin/*` routes proxied to IdP.

Controls
- Enforce least‑privilege roles at IdP for `/api/admin/*`
- Optionally add PDP `endpoint_map` for sensitive actions
- Ensure audit: Kafka security/audit events and BFF logs

Verification
```bash
curl -I --cookie "_eid_sid=..." https://.../api/v1/admin/health
```

Risks
- Accidental exposure of admin operations; never make `/api/v1/admin/*` public

See also: `../reference/idp-admin-proxy`, `../reference/pdp-mapping`


