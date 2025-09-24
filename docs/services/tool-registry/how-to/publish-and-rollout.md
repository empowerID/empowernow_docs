---
title: Publish and Roll Out a Tool Version
---

## Goal
Publish a new schema version and flip CURRENT atomically, with grace for the previous version.

## Steps
1) Create the tool (once)
```
POST /tools {"id":"mcp:billing:pay","risk_tier":"high","auth_mode":"oauth_chaining","grace_seconds":14400,"cost_per_call":0.10}
```
2) Add a version (optionally `activate`)
```
POST /tools/mcp:billing:pay/versions {"schema_version":"1.0.0","endpoint":"https://.../pay","schema":{...},"activate":true}
```
3) Flip CURRENT later
```
POST /tools/mcp:billing:pay/rollout {"schema_version":"1.1.0"}
```

## Verify
- `GET /tools/{id}` shows `schema_version` and `previous_version`.
- ETag header present; conditional GET returns 304.

## See also
- Reference: `services/tool-registry/reference/api.md`

