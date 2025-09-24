# Budgeting & Receipts Overview

## Budgeting
- Pre-call budget hold via PDP client; fall back to simple hold if hints API missing
- Enforce per-subject/agent/model budgets

## Receipts
- Record spend receipts with model, tokens, subject, agent_id
- Emit to analytics for cost tracking and anomaly detection

## Outage behavior
- If PDP unavailable, use LKG where configured; receipts still emitted

## References
- `src/api/v1/endpoints/llm.py`
- `src/services/policy_client.py`
