## AI Classification: Developer Implementation Guide

### Purpose
Attach a governable category to LLM prompts/tool calls for spend governance and analytics, with two modes:
- Inline/immediate: enforce and persist `category` now.
- Lazy/advisory: carry `proposed_category` and mark `category_pending=true` for later review/apply.

### Signal precedence
- Header `X-Category` (or body `category`) > registry tag > ML proposer.
- In lazy mode, ML proposer runs only if no header/body category is supplied.

## Where it runs
- BFF (LLM): classification is advisory and occurs before provider call, on masked text.
  - `ms_bff_spike/ms_bff/src/services/llm_pipeline.py`:
    - `derive_category_and_mode(body, headers)` → `(category, category_mode)`.
    - `maybe_propose_category(messages, headers)` → `(label, confidence, source)` when `x-category-mode=lazy`.
    - `build_policy_snapshot(constraints, user_id, category, category_mode, proposed)` → injects classification fields into receipts.
  - `ms_bff_spike/ms_bff/src/services/category_proposer.py` implements backends.
  - PDP-aware export: the predicted category can be exported to PDP context (once per request) when enabled by config (`classifier.yaml` → `policy_export`). The same prediction is reused for strict guard to avoid duplicate inference.

## Backends and configuration
- Enable classification:
  - `ENABLE_CLASSIFIER=true`
  - `CLASSIFIER_BACKEND=heuristic|hf|onnx` (default: heuristic)
- HuggingFace (DistilBERT or any sequence-classification model):
  - `CLASSIFIER_BACKEND=hf`
  - `CLASSIFIER_MODEL=<hf-model-id>` (e.g., `distilbert-base-uncased` or your fine-tuned ID)
  - Optional label map to normalize model outputs:
    - `CLASSIFIER_LABEL_MAP='{"0":"dev","1":"data","2":"finance","3":"marketing"}'`
- ONNX (DistilBERT exported):
  - `CLASSIFIER_BACKEND=onnx`
  - `CLASSIFIER_ONNX_PATH=/app/models/distilbert.onnx`
  - `CLASSIFIER_TOKENIZER=distilbert-base-uncased`
  - `CLASSIFIER_LABELS=dev,data,finance,marketing`
- Tuning:
  - `CLASSIFIER_MIN_CONFIDENCE` (default 0.6) – use in downstream decisions/UI (we don’t block on low confidence in advisory mode).

Notes:
- Runs on masked text (post-preflight redaction). Balanced/Raw modes may allow approved raw fragments per policy in the future.
- In-process memoization caches `{text_sha256 -> (label, confidence)}` per worker lifetime.
- If HF/ONNX loading fails, falls back to heuristic.

## Policy snapshot and receipts
Receipts include classification fields under `policy_snapshot`:
- Inline mode: `category: <label>`
- Lazy mode: 
  - `category_pending: true`
  - `proposed_category: <label>`
  - `proposed_category_confidence: <0..1>` (when available)
  - `proposed_category_source: "ml|header|registry"`
Always include `subject_arn` for attribution.

## Analytics integration
- Pending receipts default to `uncategorized` until applied.
- Admin apply sets prospective attribution; optional corrective deltas for same-day counters.
- Metrics exposed/expected:
  - `aria_analytics_classify_proposed_total{source}`
  - `aria_analytics_classify_apply_total{result}`
  - `aria_analytics_classify_latency_ms`
- DSAR tombstones: receipts marked as tombstoned are filtered from recent views; CH `is_deleted`/TTL wiring is documented for OLAP.

## PDP semantics (budgets)
- When `category_pending=true`, PDP skips category-scoped budgets or evaluates against an `uncategorized` pool if configured.
- Inline `category` participates normally in category/provider/model pools.
- Budget advisory mode: `PDP_BUDGET_MODE=advisory|enforce|off` (advisory returns `spend_snapshot` without deny).

## Config: PDP-aware export gating
- `ServiceConfigs/BFF/config/classifier.yaml` supports an optional `policy_export` block to control export to PDP:
  - `policy_export.enabled: true|false` (default true)
  - `policy_export.min_conf: 0.40` (optional floor)
  - `policy_export.labels_allowlist: []` (empty = export all labels)
- Exported fields in PDP context: `category_label`, `category_confidence`, `category_source`, `category_mode`.

## Streaming enforcement (FYI)
- SSE extractor inspects both assistant text and tool/function deltas; token caps apply to measured tokens where available. Multi‑provider parity is in progress.

## Deployment quickstart (compose)
Example in `CRUDService/docker-compose-authzen4.yml` (BFF service):
```yaml
# Advisory classifier (lazy mode only)
ENABLE_CLASSIFIER: "true"
CLASSIFIER_BACKEND: hf
CLASSIFIER_MODEL: distilbert-base-uncased
CLASSIFIER_LABEL_MAP: '{"0":"dev","1":"data","2":"finance","3":"marketing"}'
```
Switch to ONNX:
```yaml
CLASSIFIER_BACKEND: onnx
CLASSIFIER_ONNX_PATH: /app/models/distilbert.onnx
CLASSIFIER_TOKENIZER: distilbert-base-uncased
CLASSIFIER_LABELS: dev,data,finance,marketing
```

## Testing
- Unit tests (heuristic + HF stub): `ms_bff_spike/ms_bff/src/tests/services/test_category_proposer.py`.
  - `test_proposer_enabled_and_labels` – heuristic path.
  - `test_proposer_hf_backend_stubbed` – stubs tokenizer/model to validate HF path without download.
- Run tests (disable plugin autoload if needed):
```bash
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 pytest -q ms_bff/src/tests/services/test_category_proposer.py
```
- Analytics tests use `ANALYTICS_DISABLE_CH=1` to skip ClickHouse inserts in unit tests.

## Privacy & performance
- Default on masked text; no prompt bodies in receipts/logs.
- Keep p95 proposer latency ≤ 30ms via model warmup and memoization. Consider ONNX quantization if needed.

## Roadmap
- Multi-provider stream normalization/tokenization parity.
- Usage reconciliation event when provider usage arrives.
- ClickHouse TTL/projections and coordinated raw-blob deletes.
- Redis/CH-backed cache for classification to improve cross-process reuse.


