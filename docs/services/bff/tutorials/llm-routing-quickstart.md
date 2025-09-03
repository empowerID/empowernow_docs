---
title: LLM Routing Quickstart
tags: [service:bff, area:llm, feature:dynamic-model-routing]
---

## Prerequisites

- BFF with `/chat/completions` enabled
- PDP reachable with model/egress constraints
- Pricing map and (optional) receipts/budget holds configured

## Steps

1) Set pricing and budgets

```bash
export LLM_PRICING_JSON='{"gpt-4o-mini":{"in":0.00015,"out":0.0006},"gpt-4.1":{"in":0.0005,"out":0.0015}}'
export REDIS_URL=redis://redis:6379/0
```

2) Call the endpoint

```bash
curl -sS -X POST "$BFF/api/chat/completions" \
  -H "Content-Type: application/json" \
  --data '{"model":"gpt-4.1","messages":[{"role":"user","content":"Summarize"}],"max_tokens":128}' -i
```

## Validate

- `x-aria-model-selected` present
- `x-aria-model-rerouted: true|false`
- 402 = budget denial; 403 = policy denial


