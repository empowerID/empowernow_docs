## Effective Budgets API

Returns a snapshot of “effective” AI spend budgets for the authenticated subject by merging Analytics counters/overrides with PDP policy defaults.

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
- This API is designed for UI/ops snapshots, not per‑call enforcement. Per‑call gating occurs during PDP evaluation based on policy constraints and the BudgetState PIP.
- `limit_usd` is effective: Analytics override if present, else policy default (`constraints.spend_budget.limit_usd`).
- `remaining_policy_usd = max(limit_usd - consumed_usd, 0)`.
- Multiple entries return when policies specify selectors (see Selectors below).

### Policy constraints (source of truth)

- `constraints.spend_budget` fields recognized by PDP:
  - `scope`: `tenant` | `project` | `user`
  - `period`: `daily` | `monthly`
  - `limit_usd`: number (null/absent → unlimited)
  - Optional selectors: `provider`, `model`, `category`

### Selectors and merge rules

- When multiple `spend_budget` constraints apply, PDP groups them by distinct selector tuple `(scope, period, provider?, model?, category?)` and applies a most‑restrictive merge: take the minimum `limit_usd` within each group.
- During evaluation, PDP queries BudgetState for each applicable selector pool and denies if any pool has no remaining budget or the estimated cost exceeds remaining.

### Category semantics

- If `context.policy_snapshot.category_pending == true`, PDP treats category‑scoped pools as absent (or evaluates against an `uncategorized` pool when explicitly configured). Overall/provider/model pools still apply.
- If `context.category` is present, PDP evaluates category pools normally. Most‑restrictive semantics apply across overall/provider/model/category.

### Deny reasons (normalization)

- `budget_exhausted`: remaining is ≤ 0 in any applicable pool.
- `budget_insufficient_for_request`: remaining < estimated cost (when `estimated_cents` provided by PEP).

### Context inputs from PEPs (advisory)

- Recommended fields provided by PEPs (BFF/MCP) in PDP request context:
  - `tenant_id` (for attribution)
  - `estimated_cents` (preflight estimate)
  - Optional selectors: `provider`, `model`, `category`

### Visual

```mermaid
flowchart LR
  subgraph PEP
    BFF[BFF/MCP]
  end
  subgraph PDP
    M[Merge spend_budget constraints\n(min per selector)]
    PIP[BudgetState PIP\n(Analytics)]
  end
  BFF --> M --> PIP
  PIP -->|remaining per pool| M
  M -->|decision/deny reason| BFF
```

### Dependencies
- BudgetState PIP calls Analytics `GET /api/v1/analytics/budgets/state` (Redis‑backed) to fetch counters and optional overrides. Gateways may still maintain an authoritative Redis ledger for per‑call holds.

### Performance & caching
- The endpoint is optimized for UI reads (short latency, in-process TTL cache ~2s configurable).
- Return shape is stable; missing data returns `snapshot: []`.

### See also
- BFF budgets and 402 mapping: `services/bff/how-to/llm-routing-budgets.md`
- Analytics runtime budgets API: `services/analytics/reference/runtime-apis.md`
- BFF route proxy: `services/experience/overview` and `ServiceConfigs/BFF/config/routes.yaml`

