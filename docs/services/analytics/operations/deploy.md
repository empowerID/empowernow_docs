---
title: Deploy Analytics
---

Add the Analytics service alongside Redis. Keep it internal; protect via network policy/mTLS if exposed.

```yaml
analytics:
  build: ./analytics
  ports: ["8090:8090"]
  environment:
    - REDIS_URL=redis://redis:6379/0
    - REGISTRY_URL=http://tool-registry:8081
    - RECEIPT_PUBLIC_KEY_PEM=${RECEIPT_PUBLIC_KEY_PEM}
  command: uvicorn analytics.main:app --host 0.0.0.0 --port 8090
  depends_on: [redis, tool-registry]
```

### Environment
- `RECEIPT_PUBLIC_KEY_PEM` (required) — public key for JWS verification
- `REDIS_URL` — hot state
- `REGISTRY_URL` — optional tool pricing

### Health checks
- `GET /api/v1/analytics/runtime/hot?tenant_id=default`

### See also
- Explanation: `services/analytics/explanation/receipt-centric-architecture.md`
- Reference: `services/analytics/reference/runtime-apis.md`

