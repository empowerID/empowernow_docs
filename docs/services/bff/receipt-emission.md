# Receipt Emission (BFF/PEP)

- Emit pre/post receipts around each protected call
- Compute `prev_hash`, `self_hash`; JWS‑sign; write to ClickHouse + S3; anchor head hash
- Budget 402: return deterministic error; settle holds to actuals in post‑call receipt

See also: `services/receipts/quickstart.md`
