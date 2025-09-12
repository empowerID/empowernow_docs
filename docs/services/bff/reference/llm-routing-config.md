---
title: LLM Routing Configuration Reference
tags: [service:bff, area:llm, feature:dynamic-model-routing]
---

## Environment

- `LLM_PRICING_JSON` or `LLM_PRICING_PATH` — pricing for estimation
- `REDIS_URL` — budget holds (prod); dev can use in-process stub
- `RECEIPT_VAULT_URL` — optional receipts service
- Classifier guard env toggles (ops-side overrides):
  - `CLASSIFIER_GUARD_ENABLED` (`true`|`false`)
  - `CLASSIFIER_BLOCK_MIN_CONF` (e.g., `0.75`)
  - `CLASSIFIER_BLOCK_LABELS` (comma-separated)

## Headers

- Response: `x-aria-decision-id`, `x-aria-model-selected`, `x-aria-model-rerouted`

## Endpoints

- `POST /chat/completions`

## Code entry points

- Endpoint: `ms_bff/src/api/v1/endpoints/llm.py`
- Enforcement: `ms_bff/src/services/llm_enforcement.py`
- Budget: `ms_bff/src/services/llm_budget.py`
- Receipts: `ms_bff/src/services/llm_receipts.py`

## Classifier guard — action mapping

Optional mapping from category labels to runtime actions. Default and per-label actions are supported. When configured, preflight returns additional fields the endpoint honors: `stream_allowed`, `model_override`, and `budget_hints`.

```yaml
# ServiceConfigs/BFF/config/classifier.yaml
guard:
  enabled: true

  block_labels:
    - secrets
    - credential_theft
    - account_takeover
    - jailbreak
    - policy_bypass
    - malware
    - exfiltration
    - prompt_injection
  min_conf: 0.75
  per_label_thresholds:
    secrets: 0.60
    prompt_injection: 0.65

  actions:
    default:
      disallow_stream: false

    high_cost_request:
      cap_tokens: 2048
      route_model: gpt-4o-mini
      budget:
        hold_multiplier: 1.5
        max_cents: 5000

    tools_egress_required:
      disallow_stream: true
      cap_tokens: 1024
      budget:
        hold_multiplier: 1.2
        min_remaining_usd: 5.0
```

Supported actions:
- `disallow_stream: bool`
- `cap_tokens: int`
- `route_model: string`
- `budget`:
  - `hold_multiplier: float (>0)`
  - `max_cents: int (>0)`
  - `min_remaining_usd: float (>=0)`


