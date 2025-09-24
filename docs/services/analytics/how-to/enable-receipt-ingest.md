---
title: Enable Receipt Ingest
---

## Goal
Producers POST signed JWS receipts to Analytics without impacting request latency.

## Assumptions
- BFF/ARIA already emit receipts via Receipt Vault.
- Analytics is reachable at `/api/v1/analytics` (via BFF route or direct).

## Steps
1. Configure BFF/ARIA to call Analytics after receiving `{ jws, hash }` from Receipt Vault.
2. Use a short timeout and ignore failures.

Example (producer helper):

```python
async def emit_receipt_to_analytics(jws: str, source: str):
    url = os.getenv("ANALYTICS_URL", "http://analytics:8090")
    try:
        async with httpx.AsyncClient(timeout=1.5) as c:
            await c.post(f"{url}/api/v1/analytics/receipts:batch", json={"jwss": [jws], "source": source})
    except Exception:
        pass  # non-blocking
```

## Verify
- `POST /api/v1/analytics/receipts:batch` returns `accepted>=1`.
- `GET /api/v1/analytics/runtime/hot?tenant_id=t1` shows spend increments.

## See also
- BFF bridging: `services/bff/how-to/analytics-audience-bridged-via-bff.md`
- Receipt chains: `services/aria-shield/receipt-chains.md`

