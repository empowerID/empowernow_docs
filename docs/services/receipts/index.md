# Receipts (Tamper‑Evident Audit)

What it is: signed, hash‑chained receipts for high‑value actions, with human‑readable diffs and external anchoring.

- Receipt: who/what/when/why/budget/result per step
- Hash chain: `prev_hash` links a tamper‑evident timeline
- Visual diffs: plan, data, budget
- Anchoring: periodically commit head hash (S3 Object Lock/Notary/L2)

## Minimal schema (compact)
```json
{
  "id":"rec_01HZW...","ts":"2025-10-05T14:22:11Z",
  "actor":{"user":"u:pparker","agent":"aria://bff/agent-42","client":"bff-web"},
  "plan":{"id":"plan_c8a7","step":"3/7","contract":"jws:...","budget":{"tokens":1200,"ops":1}},
  "tool":{"name":"sap.bapi.createUser","schema_hash":"sha256:...","args_pin":"sha256:..."},
  "context_root":"sha256:...","input_hash":"sha256:...","output_hash":"sha256:...",
  "policy":{"request":"authzen:decision:...","effect":"Permit","constraints":["spend<=1500"]},
  "prev_hash":"sha256:prev...","self_hash":"sha256:this...","anchors":["s3://.../heads/main"]
}
```

## Diffs to render
- Plan diff: planned vs executed (added/removed/modified params)
- Data diff: JSON/table mutations
- Policy/budget diff: intended vs actual spend; triggered constraints

## Where it fits
- Emission: ARIA Shield (PEP)
- Policy: AuthZEN PDP decision ID, effect, constraints
- Storage: ClickHouse (query) + S3 (immutable)
- Visualization: Grafana timeline with per‑step diffs

## Threat model highlights
- Integrity: hash chaining + JWS signatures + anchored heads
- Drift: schema pins (`schema_hash`, `args_pin`) guard capability drift
- Replay: include `ts`, `id`, and plan step (`plan.step`) in signed payload
- Clocks: tolerate skew with bounded windows; verify monotonicity of chain

See also: Quickstart, API, Storage, UI, Security, FAQ.
