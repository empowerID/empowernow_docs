# Product — ARIA Gateway (MCP PEP)

## Overview
The ARIA Gateway is a policy enforcement point (PEP) at the agent→tool boundary. It terminates MCP/HTTP requests, verifies the agent’s ARIA Passport, and enforces policy before any tool executes.

- MCP‑aware ingress: `POST /mcp/{tool_id}`
- Normalizes PDP responses (nested or top‑level) into enforceable constraints
- Executes obligations (e.g., receipts, analytics) on permit

## Boundary enforcement (what’s enforced)
- Identity binding: pairwise `sub` and `act.sub` from the ARIA Passport; optional PoP (DPoP) support downstream in roadmap
- Schema pins: verify `{schema_version, schema_hash}` from Tool Registry with rollout grace windows
- Params allowlists: regex by key per tool
- Egress allowlists: host[:port] allow‑listed; redirects denied unless configured and target still allow‑listed
- Plan‑step checks: verify plan tool and params fingerprint match signed plan JWS (when present)
- Budget gating: idempotent debit per `call_id`; 402 if insufficient budget
- Inbound shaping: optional redaction, rails injection, token/byte caps, data_scope tagging

## Plan + budget (enforcement lifecycle)
1) Read plan contract (JWS) from Passport; check current step matches `{tool, params_fingerprint}`
2) Debit budget idempotently using `call_id`; on retry, subsequent debits are 0
3) Evaluate with PDP; on deny, stop before tool execution
4) Enforce inbound caps/allowlists and egress pinning; forward sanitized request to tool
5) On success, advance plan step; emit signed receipt (hash‑chained)

## Example ingress (shape)
Request:
```json
{
  "args": {"amount": "12.34", "q": "SFO"},
  "instruction": "search for flights",
  "sql": null
}
```
Response (tool’s JSON, sanitized) on permit; on deny, standard HTTP error with reason code (e.g., `egress_denied`, `plan_step_violation`, `budget_exceeded`).

## Obligations and receipts
- On permit, emit a signed, hash‑chained receipt: includes policy snapshot (constraints), schema hash, params hash, and linkage to the previous receipt
- Tee analytics with constraints fingerprints and timings (no token bodies)

## Interoperability
- Works with any AuthZEN‑compatible PDP (nested or top‑level constraints)
- Consumes Tool Registry metadata (ETag‑friendly) for schema pins and rollout
- Emits receipts to the Receipt Vault service for signing/anchoring

CTAs: See MCP request → View guards (schema/params/egress) → Read plan/budget enforcement
