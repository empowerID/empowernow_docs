# Storage — ClickHouse + S3 Object Lock

## ClickHouse table (wide + JSON)
```sql
CREATE TABLE receipts (
  id String,
  ts DateTime64(3,'UTC'),
  actor_user String,
  actor_agent String,
  client String,
  plan_id String,
  plan_step String,
  tool_name String,
  schema_hash String,
  args_pin String,
  prev_hash String,
  self_hash String,
  anchors Array(String),
  policy_json JSON,
  receipt_json JSON
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (plan_id, ts)
SETTINGS index_granularity = 8192;
```

- Keep raw `receipt_json` for future fields; extract hot fields for filters
- Retention: 12–24 months hot (ClickHouse), archive cold to S3 Glacier

## S3 Object Lock
- Bucket with Object Lock (compliance mode), versioning ON
- Keying: `plans/{plan_id}/steps/{step}.json` and `plans/{plan_id}/heads/latest`
- Anchor: write latest head hash to `heads/latest` (short TTL cache OK)
- Lifecycle: transition old steps to Glacier Deep Archive per policy

## Indexing hints
- ORDER BY `(plan_id, ts)` for timeline queries
- Projections for `actor_user`, `tool_name`, and `policy.effect` filters

See also: Analytics dashboards recipe.
