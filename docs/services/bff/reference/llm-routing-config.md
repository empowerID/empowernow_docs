---
title: LLM Routing Configuration Reference
tags: [service:bff, area:llm, feature:dynamic-model-routing]
---

## Environment

- `LLM_PRICING_JSON` or `LLM_PRICING_PATH` — pricing for estimation
- `REDIS_URL` — budget holds (prod); dev can use in-process stub
- `RECEIPT_VAULT_URL` — optional receipts service

## Headers

- Response: `x-aria-decision-id`, `x-aria-model-selected`, `x-aria-model-rerouted`

## Endpoints

- `POST /chat/completions`

## Code entry points

- Endpoint: `ms_bff/src/api/v1/endpoints/llm.py`
- Enforcement: `ms_bff/src/services/llm_enforcement.py`
- Budget: `ms_bff/src/services/llm_budget.py`
- Receipts: `ms_bff/src/services/llm_receipts.py`


