# API — Receipt Schema and Validation

## Fields
- id: string (ulid/uuid)
- ts: RFC3339 timestamp (UTC)
- actor.user, actor.agent, actor.client: strings
- plan.id, plan.step, plan.contract (JWS), plan.budget { tokens, ops }
- tool.name, tool.schema_hash, tool.args_pin
- context_root, input_hash, output_hash
- policy.request, policy.effect, policy.constraints[]
- prev_hash, self_hash, anchors[]

## Hashing rules
- `self_hash = H(canonical_json_without_self_hash)`
- Canonicalization: RFC8785 or deterministic serializer
- Hash algorithm: SHA‑256 (prefix `sha256:`)

## JWS profile
- alg: ES256/EdDSA; protected header `typ: JOSE`
- Payload: canonical receipt (without `self_hash`)
- Key management: rotated by PEP; publish JWKS for verification

## Anchor write contract
- `PUT heads/latest` with body = latest `self_hash` and metadata `{ plan_id, ts }`
- Idempotent; last‑write‑wins with monotonic `ts`

## Validation checklist
- prev/self chain links without gaps; ts monotonic per plan
- JWS valid and key not revoked at ts
- schema_hash/args_pin (if present) match registry pins
- policy.effect in { Permit, Deny } and constraints parse

See also: Quickstart, Security.
