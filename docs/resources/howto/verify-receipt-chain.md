# How‑To: Verify a Receipt Chain

1. Fetch plan receipts ordered by ts
2. Recompute `self_hash` for each receipt; compare to stored value
3. Ensure `prev_hash` of step N equals `self_hash` of step N-1
4. Fetch anchored head (S3 `heads/latest`); compare to last `self_hash`
5. Log discrepancies; export results to SIEM

See also: `services/receipts/api.md`
