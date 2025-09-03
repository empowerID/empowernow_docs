---
title: Enable Dynamic Model Routing
tags: [service:bff, area:llm, feature:dynamic-model-routing]
---

## Steps

1) Ensure PDP policy for `llm:openai:chat` returns model and egress allowlists.
2) Provide pricing via `LLM_PRICING_JSON` or `LLM_PRICING_PATH`.
3) Set `REDIS_URL` for production budget holds (optional in dev).
4) Deploy BFF and verify routing headers on responses.


