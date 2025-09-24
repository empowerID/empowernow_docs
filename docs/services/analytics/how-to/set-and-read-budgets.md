---
title: Set and Read Budgets
---

## Goal
Set daily/monthly limits and read current consumption for UI tripwires and dashboards.

## Steps
1. Set a limit

```
PUT /api/v1/analytics/budgets/limit
{
  "tenant_id": "acme",
  "scope": "user",
  "subject_id": "auth:account:empowernow:alice",
  "period": "monthly",
  "limit_usd": 25.0
}
```

2. Read state

```
GET /api/v1/analytics/budgets/state?tenant_id=acme&scope=user&subject_id=auth:account:empowernow:alice&period=monthly
→ { "consumed_usd": 13.2, "limit_usd": 25.0, "remaining_usd": 11.8 }
```

## Notes
- PDP’s BudgetState PIP uses this runtime state during evaluation.
- When `limit_usd` is null, PDP falls back to policy defaults per `spend_budget`.

## See also
- PDP Effective Budgets: `services/pdp/reference/effective-budgets.md`

