# Recipe: Export Receipts to SIEM

- Stream `receipt_json` to Kafka/Elastic with topic/index `receipts`
- Mask PII fields if required; keep hashes intact
- Include anchors and verification state for dashboards

See also: `services/receipts/storage.md` and `services/analytics/receipts-dashboards.md`
