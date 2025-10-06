# Metrics/Event Taxonomy — Receipts

Events
- receipt_emitted { plan_id, step, effect }
- receipt_anchored { plan_id, head_hash }
- chain_verified { plan_id, result }
- budget_settled { call_id, intended, actual }

Use: product analytics, SIEM, and Grafana annotations.
