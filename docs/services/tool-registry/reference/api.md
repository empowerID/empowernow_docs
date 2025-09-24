---
title: API Reference
---

## Read (hot path)

### GET /tools/{tool_id}
Response
```
{ "id":"...","endpoint":"...","schema_version":"1.2.0","schema_hash":"sha256:...",
  "previous_version":"1.1.9","previous_hash":"sha256:...",
  "updated_at":1735670000, "grace_seconds":14400, "risk_tier":"med","auth_mode":"api_key","cost_per_call":0.05 }
```
Headers: `ETag`, `Cache-Control: public, max-age=60`

### HEAD /tools/{tool_id}
Returns headers only.

### GET /tools/{tool_id}/pin` or `/pins/{tool_id}
Minimal pin payload; add `?format=jws` to receive a compact JWS when signing is configured.

## Admin (write)

### POST /tools
Create a tool.

### POST /tools/{tool_id}/versions
Add a schema version; `activate` flips CURRENT.

### POST /tools/{tool_id}/rollout
Flip CURRENT to a specific `schema_version` atomically.

## Security & caching
- Protect write endpoints (admin token/JWT/mTLS/OPA).
- Read endpoints are cacheable and safe behind an internal CDN.

## See also
- Architecture: `services/tool-registry/explanation/architecture.md`

