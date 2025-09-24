---
title: PATs API Reference
---

## POST /api/idp/oauth/pat
Issue a PAT; returns raw token once.

Body
```
{ "label": "cursor-dev-jd", "scopes": ["openid"], "ttl_days": 90 }
```
Response
```
{ "pat_id":"pat_01H...","token":"aria_pat_...","prefix":"aria_pat_ab12cd34","expires_at":"..." }
```

## GET /api/idp/oauth/pat
List PATs for a user.

Query: `tenant_id=...&user_arn=...`

## DELETE /api/idp/oauth/pat/{pat_id}
Revoke a PAT.

## POST /api/idp/oauth/pat/introspect
Introspect a PAT (service‑to‑service).

Body: `{ "token": "aria_pat_..." }`

Response (example)
```
{ "version":1, "active":true, "tenant_id":"t1", "user_arn":"auth:account:idp:123",
  "identity_arn":"auth:identity:...", "scopes":["llm:proxy:openai"],
  "client_id":"cursor", "pairwise":"p~Y2...", "expires_at":"...",
  "pat_id":"pat_01H...","prefix":"aria_pat_dev_ab12cd34" }
```

Security
- IdP enforces mTLS/allowlist; short Redis micro‑cache on positives (< 3s)

See also
- Overview: `services/idp/explanation/pats-overview.md`

