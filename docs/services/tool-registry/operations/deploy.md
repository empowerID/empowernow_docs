---
title: Deploy Tool Registry
---

Minimal compose snippet:

```yaml
tool-registry:
  build: ./tool_registry
  ports: ["8081:8081"]
  environment:
    - REGISTRY_DB_URL=sqlite:////data/registry.db
    - ADMIN_TOKEN=${REGISTRY_ADMIN_TOKEN:-dev-admin}
    - GRACE_SECONDS_DEFAULT=14400
    # Optional signed pin
    # - PIN_SIGNING_KEY_PEM=${PIN_SIGNING_KEY_PEM}
    # - PIN_JWS_KID=tr-001
    - TOOL_REGISTRY_ISSUER=https://tool-registry.local
  volumes:
    - registry-data:/data
  command: uvicorn main:app --host 0.0.0.0 --port 8081
```

Health: `GET /healthz` returns `{ok:true}`.

See also: `services/tool-registry/reference/api.md`

