# Product — IdP: Agent Passports

## Overview
Issue ARIA Passports for AI agents via OAuth Token Exchange (RFC 8693) with Rich Authorization Requests (RFC 9396). Passports carry least‑privilege context for agents:
- Pairwise identities (`sub`) and actor chain (`act.sub`)
- Plan contracts (JWS) and tool schema pins from the Tool Registry
- Optional DPoP binding (`cnf.jkt`, RFC 9449)
- Policy‑gated identity chaining endpoints
- Discovery + JWKS and ARIA claims documentation endpoints

## Why it matters
Move agent governance “left” into identity. Instead of loose API keys or opaque tokens, agents receive verifiable, purpose‑built credentials that encode plan discipline, schema integrity, budgets/max_steps, and (optionally) proof‑of‑possession.

## Identity Chaining (feature‑flagged)
Two flows are supported; both are gated by PDP constraints (`constraints.identity_chain`):
- Delegated assertion: mint a short‑lived Identity Assertion JWT
  - POST `/api/oidc/oauth/identity-assertion`
  - Inputs: `subject_token`, (optional) `actor_token`, `audience`, optional `scope`
  - Output: `{ assertion, token_type, expires_in }` (≤ configured TTL, max ~300s)
- Brokered exchange: exchange the assertion at a SaaS AS
  - POST `/api/oidc/oauth/identity-chain/token`
  - Inputs: `subject_token`, (optional) `actor_token`, `audience`, optional `scope`, `token_endpoint`, `client_auth`
  - Output: downstream `{ access_token, expires_in, ... }`

PDP decides which audiences/scopes are allowed, TTL caps, and whether DPoP/MTLS are required. IdP enforces those constraints before minting.

## Plan Contracts and Schema Pins
- Plan JWS: signed plan with step indices, params fingerprints, and max cost per step; gives PEPs a verifiable contract for step discipline.
- Schema pins: `{schema_version, schema_hash}` for each requested tool, pulled from the Tool Registry; enables rollout windows while preventing shape drift.

## Claims Reference (example)
A passport extends standard JWT claims with `authorization_details` (RAR) and an ARIA section:

```json
{
  "iss": "https://idp.example.com",
  "sub": "pairwise:9a7b1c2d3e4f5a6b",
  "aud": "aria.gateway",
  "exp": 1735689600,
  "iat": 1735686000,
  "jti": "be0bfe61-2c36-4b72-9d8a-34a5f3c2a108",
  "act": { "sub": "agent:svc-123:for:9a7b1c2d3e4f5a6b" },
  "authorization_details": [
    {
      "type": "aria_agent_delegation",
      "tools": ["mcp:flights:search"],
      "schema_pins": {"mcp:flights:search": {"schema_version": "1.2.0", "schema_hash": "sha256:..."}}
    }
  ],
  "aria": {
    "bound_sub": "pairwise:9a7b1c2d3e4f5a6b",
    "tenant": "acme",
    "schema_pins": {"mcp:flights:search": {"schema_version": "1.2.0", "schema_hash": "sha256:..."}},
    "plan_contract_jws": "<JWS or null>",
    "call_id": "79dfe9b6-5d0e-4b6e-ae9a-d68a1f0c0e0f",
    "budget": {"initial": 100.00, "currency": "USD"},
    "max_steps": 20
  },
  "cnf": { "jkt": "base64url(SHA256(JWK_thumbprint))" }
}
```

## Security Model
- DPoP binding at token endpoint (optional) with replay protection (JTI cache); `cnf.jkt` signals PoP.
- Pairwise subjects mitigate cross‑audience linkability; agent `act.sub` binds the user→service relationship.
- Plan JWS + schema pins ensure step/order and shape integrity.
- Fail‑closed defaults on invalid/missing RAR, inactive delegations, or audience mismatch.

## Discoverability and Docs
- Discovery advertises supported RAR types, identity chaining endpoints, and DPoP capability.
- JWKS exposed at both `/jwks` and `/.well-known/jwks.json`.
- ARIA docs endpoints:
  - `GET /aria-metadata` — feature flags and capability snapshot
  - `GET /aria-claims` — claims schema and examples

## Interoperability
- ARIA Gateway accepts Passports as Bearer or (optionally) PoP.
- PDP governs identity chaining audiences/scopes/TTL; Gateway enforces constraints and obligations.
- Tool Registry is authoritative for pins; Receipt Vault signs and chains receipts downstream.

CTAs: See identity chaining → Read claims reference → View discovery/JWKS
