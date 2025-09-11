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

### Budget enforcement modes (BFF)

- `BFF_BUDGET_MODE=redis_authoritative` (default)
  - Order: PDP evaluate first (context includes `estimated_cents`), then Redis HOLD.
  - If HOLD fails (missing/insufficient `budget:{subject}`) → `402 Payment Required`, even if PDP allowed.
  - Keys: `budget:{subject}`, `hold:{call_id}`, `seen:{call_id}`, `budget:refunds` (idempotent via `call_id`).

- `BFF_BUDGET_MODE=pdp_authoritative`
  - If a Redis override exists (`budget:{subject}`) → enforce HOLD (idempotent).
  - If no override → trust PDP allow; do not return 402 on Redis path. Usage is still recorded best‑effort.

Tip: Use `pdp_authoritative` for pilots/sandboxes; prefer `redis_authoritative` for hard monetary enforcement.

## Receipts

Optional: set `RECEIPT_VAULT_URL` to emit signed receipts with policy snapshot and usage/estimate.


