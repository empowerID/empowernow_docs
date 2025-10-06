# Plan JWS & Schema Pins → Receipt Mapping

- Plan JWS fields map to `plan.step`, `tool.name`, `args_pin`, `schema_hash`
- Verify signature and match planned payload to executed call
- Deny on mismatches; emit receipt with `effect = Deny` referencing mismatch

See also: `services/receipts/api.md`
