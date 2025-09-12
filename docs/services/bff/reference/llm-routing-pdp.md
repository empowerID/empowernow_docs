---
title: LLM Routing PDP Reference
tags: [service:bff, area:llm, feature:dynamic-model-routing]
---

## Policy examples

```yaml
rules:
  - effect: permit
    resource: "llm:openai:chat"
    action: "invoke"
    on_permit:
      constraints:
        model:  { allow: ["gpt-4o-mini", "gpt-4.1"] }
        tokens: { max_output: 1500, max_stream: 4096 }
        egress: { allow: ["api.openai.com:443"] }
        spend_budget: { scope: "user", period: "monthly", limit_usd: 25.0 }
        # Optional: classifier export for PDP-side context; BFF also exports when enabled
```

## Sample PDP requests and responses

Allow path (request → response) and budget deny examples are in the source doc and can be reused verbatim when needed.

Preflight output fields (BFF → endpoint) when classifier actions are configured:
- `stream_allowed: bool`
- `model_override: string | null`
- `budget_hints: map`
- `actions_applied: string[]`
- `label: string | null`
- `label_confidence: number`


