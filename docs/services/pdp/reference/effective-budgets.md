## Effective Budgets API

Returns a snapshot of “effective” AI spend budgets for the authenticated subject by merging Analytics overrides with PDP policy defaults.

### Endpoint
```
GET /access/v1/budgets/effective
Auth: session (via BFF) or service token (direct)
Query: scope?=user|team|tenant, period?=daily|monthly
```

Response
```json
{
  "snapshot": [
    {
      "scope": "user",
      "period": "monthly",
      "selector": { "category": null, "provider": null, "model": null },
      "limit_usd": 50.0,
      "consumed_usd": 12.34,
      "remaining_policy_usd": 37.66,
      "decision": "allow",
      "reason": null
    }
  ]
}
```

### Semantics
- `limit_usd` is effective: Analytics override if present, else policy default (`spend_budget`).
- `remaining_policy_usd = max(limit_usd - consumed_usd, 0)`.
- Multiple entries return when policies specify selectors (provider/model/category).

### Dependencies
- BudgetState PIP calls Analytics `budgets/state` (Redis-backed) to fetch counters and optional overrides.

### Performance & caching
- The endpoint is optimized for UI reads (short latency, in-process TTL cache ~2s configurable).
- Return shape is stable; missing data returns `snapshot: []`.

### See also
- BFF route proxy: `services/experience/overview` and `ServiceConfigs/BFF/config/routes.yaml`
- Experience: `services/experience/performance-budgets.md`

