# Receipts Dashboards (Grafana)

## Panels
- Plan Timeline: steps ordered by `ts`; color by effect; tool labels
- Budget Deltas: intended vs actual; per‑route breakdown
- Constraints Triggered: count by constraint over time

## Queries (ClickHouse examples)
```sql
SELECT plan_id, ts, tool_name, policy_json:effect AS effect
FROM receipts
WHERE ts >= now() - INTERVAL 24 HOUR
ORDER BY plan_id, ts
```

## Exports
- SIEM export: stream append of receipt_json to Kafka/Elastic
- Anchor proofs: link to S3 `heads/latest` for head verification

See also: `services/receipts/storage.md`
