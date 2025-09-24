---
title: Runtime APIs
---

Use these endpoints for receipt ingest, budgets, and hot state. This page is the canonical reference.

## POST /api/v1/analytics/receipts:batch
Body
```
{ "jwss": ["<JWS>"], "source": "aria|bff" }
```
Response
```
{ "accepted": 1, "results": [{"call_id":"...","agent_id":"...","chain_ok":true,"cost_usd":0.0042}] }
```
Notes
- Verifies JWS; chain continuity is reported as `chain_ok`.
- Non‑blocking ingestion is recommended at producers.

## PUT /api/v1/analytics/budgets/limit
Body
```
{ "tenant_id":"t", "scope":"user|tenant|project", "subject_id":"...", "period":"daily|monthly", "limit_usd": 25.0 }
```
Response: `{ "ok": true }`

## GET /api/v1/analytics/budgets/state
Query
```
tenant_id=...&scope=...&subject_id=...&period=daily|monthly
```
Response
```
{ "period_key":"YYYYMM|YYYYMMDD", "consumed_usd": 12.34, "limit_usd": 25.0, "remaining_usd": 12.66 }
```

## GET /api/v1/analytics/runtime/hot
Query: `tenant_id=...`
Response: `{ "tenant_id":"...","daily_spend_usd": 1.23, "ts": "..." }`

### See also
- Receipt chains: `services/aria-shield/receipt-chains.md`
- PDP Effective Budgets: `services/pdp/reference/effective-budgets.md`

