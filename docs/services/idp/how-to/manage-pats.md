---
title: Manage PATs (Issue, List, Revoke)
---

## Issue
- UI: PATs page → New PAT → copy token once
- API:
```bash
POST /api/idp/oauth/pat
{ "label":"cursor-dev-jd","scopes":["openid"],"ttl_days":90 }
```

## List
```bash
GET /api/idp/oauth/pat?tenant_id=t1&user_arn=arn:empowernow:iam::t1:user/jdoe
```

## Revoke
```bash
DELETE /api/idp/oauth/pat/{pat_id}
```

## Introspect (service‑to‑service)
```bash
POST /api/idp/oauth/pat/introspect
{ "token": "aria_pat_XXXXXXXXXXXXXXXX" }
```

Notes
- Postgres‑only; schema via Alembic
- IdP returns identity‑first fields; BFF caches introspection briefly

See also
- Overview: `services/idp/explanation/pats-overview.md`
- UI guide: `PAT_Management_UI_Guide.md`
- Lifecycle & policies: `PAT_Lifecycle_and_Policies.md`

