# Quickstart — Emit and Anchor Receipts

This guide shows how a BFF/PEP emits pre/post receipts, chains them, signs them, stores them, and anchors the head hash.

## Steps
1. Before call: compute `prev_hash` from prior step; prepare receipt skeleton
2. Execute tool/API call
3. After call: hash `input`/`output` and compute `self_hash = H(json_without_self_hash)`
4. JWS‑sign the receipt with PEP private key
5. Write asynchronously to ClickHouse (append) and to S3 (Object Lock)
6. Every N receipts (or plan complete), anchor head hash (S3 head object / Notary)

## Pseudocode (Python/FastAPI)
```python
from hashlib import sha256
from jwcrypto import jwk, jws

# build receipt dict r without self_hash
payload = canonicalize_json(r_without_self)
self_hash = sha256(payload).hexdigest()
r = {**r_without_self, "self_hash": f"sha256:{self_hash}"}

sig = jws.JWS(payload)
sig.add_signature(private_key, alg="ES256", protected={"typ":"JOSE"})
r_signed = {**r, "jws": sig.serialize()}  # or store alongside

clickhouse_insert(r_signed)
s3_put_object_lock(key=f"{plan_id}/{step_id}.json", body=json.dumps(r_signed))
maybe_anchor_head(plan_id, r_signed["self_hash"])  # head pointer
```

## Budget settle‑to‑actuals
- On permit: record a hold; settle to actuals in the post‑call receipt
- On exceed: return 402 with `call_id`; receipt links to policy snapshot

See also: Storage, API, UI, Security.
