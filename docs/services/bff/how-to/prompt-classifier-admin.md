---
title: Prompt Classifier – Admin Guide
---

## Purpose
Classify prompts, export an allow‑listed category to PDP for policy/budgeting, and optionally enable a strict guard.

## Configuration
- File: `ServiceConfigs/BFF/config/classifier.yaml`
- Optional overrides: `ServiceConfigs/BFF/config/classifier.d/*.yaml`

Key fields
- `enabled: true|false`
- `backend: heuristic|hf|hf_zero_shot|onnx`
- `model: <hf model id>` (for ML backends)
- `labels: [ ... ]`
- `policy_export`:
  - `enabled: true`
  - `min_conf: 0.60`
  - `labels_allowlist: [ "salary", "payroll", ... ]`
- `guard` (strict, optional):
  - `enabled: true`
  - `block_labels: [ ... ]`
  - `min_conf: 0.50`

## Runtime controls
- Header: `X-Category-Mode: strict|lazy` (strict → guard may block; lazy → advisory/export only)
- Env override: `CATEGORY_EXPORT_ENABLED=true|false`

## Rollout tips
- Start with export only (lazy); keep guard off in prod initially.
- Canary allowlist; align with PDP confidence/labels.

## See also
- Budgets (selectors and 402 mapping): `services/bff/how-to/llm-routing-budgets.md`
- PDP Effective Budgets: `services/pdp/reference/effective-budgets.md`

