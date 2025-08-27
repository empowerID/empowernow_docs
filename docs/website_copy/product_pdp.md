# Product — PDP: AuthZEN + Membership PIP

## Overview
The EmpowerNow PDP implements the OpenID Authorization API (AuthZEN) evaluation contract and returns a decision with first‑class constraints and obligations:
- Endpoints: `POST /access/v1/evaluation`, `POST /access/v1/evaluations` (batch)
- Response (rich): `{ decision, context: { constraints, obligations, decision_id, policy_version, constraints_schema, ttl_ms } }`
- App scoping: policies resolve by `resource.properties.pdp_application`
- Performance: short TTL decision cache for hot paths

## Membership‑powered constraints (PIP)
At evaluation time, the PDP queries the Membership service (Neo4j) to enrich decisions with authoritative context:
- `data_scope` — tenant_ids and `row_filter_sql` for row‑level governance
- `step_up` — MFA hints (e.g., `{ mfa_required: true, level: "strong" }`)
- `identity_chain` — allow‑listed audiences/scopes and TTL caps for identity chaining
- Capability check — verifies the agent’s requested capability (user+agent pairing)

This approach produces constraints that are consistent, explainable, and centrally governed.

## Merge model (most‑restrictive)
The PDP normalizes policy inputs and merges constraints conservatively:
- Intersection: `model.allow`, `egress.allow`, `params.allowlist`
- Minimum: `tokens.max_input`, `tokens.max_output`, `tokens.max_stream`, `spend.max_cents`, `identity_chain.max_token_ttl_seconds`
- Logical AND: `step_up.mfa_required` (conservative), booleans
- SQL AND composition: `data_scope.row_filter_sql`

Obligations merge by presence/union: `emit_receipt` is idempotent; attributes (e.g., `tee_analytics.include`) unify conservatively.

## Operator pack (policy conditions)
The PDP includes deterministic helpers suitable for content/URL checks and network gating:
- `url_host_in(url, allowlist)`
- `domain_allow(host, patterns)`
- `cidr_match(ip, cidr)`
- `content_has_phrase(text, phrases)`

## Example request/response (shape)
Request (shape):
```json
{
  "subject": {"type": "agent", "id": "agent:svc-123:for:pairwise", "properties": {"bound_user": "user:pairwise"}},
  "action": {"name": "execute"},
  "resource": {"type": "tool", "id": "mcp:flights:search", "properties": {"pdp_application": "aria-gateway", "schema_hash": "sha256:..."}},
  "context": {"capability": "mcp:flights:search", "budget_remaining": 42.0}
}
```
Response (shape):
```json
{
  "decision": true,
  "context": {
    "constraints": {
      "tokens": {"max_input": 6000, "max_output": 1500, "max_stream": 4096},
      "egress": {"allow": ["tools.example.com:443"]},
      "params": {"allowlist": {"amount": ["^\\d+(\\.\\d{1,2})?$"]}},
      "data_scope": {"tenant_ids": ["acme"], "row_filter_sql": "tenant_id='acme'"},
      "step_up": {"mfa_required": false},
      "identity_chain": {"allowed_audiences": ["https://graph.microsoft.com"], "allowed_scopes": ["User.Read"], "max_token_ttl_seconds": 300}
    },
    "obligations": [{"id": "emit_receipt"}, {"id": "tee_analytics", "attributes": {"include": ["usage", "limits"]}}],
    "decision_id": "...",
    "policy_version": "...",
    "constraints_schema": "aria.constraints.v1",
    "ttl_ms": 1500
  }
}
```

## Why this matters
AuthZEN gives you a standard, future‑proof PEP↔PDP contract. The Membership PIP ensures decisions carry live, graph‑derived context (tenancy, MFA, chaining), and the merge model keeps effective constraints conservative across policy layers.

CTAs: View evaluation examples · See Membership PIP · Read the operator/merge guide
