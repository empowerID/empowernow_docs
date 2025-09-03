---
title: Override Model Pricing
tags: [service:bff, area:llm, feature:dynamic-model-routing]
---

Use `LLM_PRICING_JSON` or `LLM_PRICING_PATH` to override pricing used for estimates during routing.

```json
{
  "gpt-4o-mini": { "in": 0.00015, "out": 0.0006 },
  "gpt-4.1":     { "in": 0.0005,  "out": 0.0015 }
}
```


