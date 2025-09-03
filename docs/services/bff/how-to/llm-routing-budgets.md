---
title: Configure Budgets and Receipts
tags: [service:bff, area:llm, feature:dynamic-model-routing]
---

## Budgets

Enable BudgetState in the PDP and return `spend_budget` constraints. BFF includes `estimated_cents` in the PDP context.

```yaml
constraints:
  spend_budget: { scope: "user", period: "monthly", limit_usd: 25.0 }
```

## Receipts

Optional: set `RECEIPT_VAULT_URL` to emit signed receipts with policy snapshot and usage/estimate.


