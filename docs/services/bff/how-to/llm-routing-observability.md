---
title: Observe and Troubleshoot LLM Routing
tags: [service:bff, area:llm, feature:dynamic-model-routing]
---

## Observability

- Headers: `x-aria-decision-id`, `x-aria-model-selected`, `x-aria-model-rerouted`
- Suggested metrics: `bff_llm_model_downgrades_total{reason}`

## Troubleshooting

- 403 with `deny`: check PDP allowlists (`constraints.model.allow`, `constraints.egress.allow`)
- 402 budget: all candidates unaffordable; lower `max_tokens` or adjust pricing/budget
- No reroute header: requested model was allowed within budget (no reroute)


