# Product Components — Cards

IdP — Agent Passports
- Issue ARIA Passports via OAuth Token Exchange (RFC 8693) with RAR (RFC 9396).
- Embed plan JWS and schema pins; optional DPoP binding (RFC 9449) and pairwise subjects.
- Policy‑gated identity chaining endpoints.

PDP — AuthZEN + Membership PIP
- Standard evaluation (/access/v1/evaluation) returning decision + constraints/obligations.
- Membership‑powered constraints: data_scope, step_up, identity_chain allowlists.

ARIA Gateway (MCP PEP)
- Enforce schema pins, params allowlists, and egress allowlists before tool calls.
- Validate plan steps, enforce budgets, and execute obligations (receipts, analytics).

BFF Spending Control
- Stream‑time token caps and leakage guards; 402 budget_exceeded behavior with receipts.
- Provider‑compatible API surface for minimal app changes.

Tool Registry
- CURRENT/pin semantics with schema version/hash and rollout grace windows; ETag caching.
- Optional signed pin JWS for integrity.

Receipt Vault
- Signed, hash‑chained receipts with policy snapshot and params hash; optional KMS anchoring.

Orchestration — Self‑Driving Workflows
- Zero‑shot execution, LLM‑native next paths, node‑centric decisions, AI‑native Mermaid diagrams.
- Enhanced responses (ai_context, next_paths, node diagrams) and resumable flows.

Membership Graph
- Delegations, capabilities, budgets/max_steps, and SaaS eligibility in Neo4j.
- Read‑only PIP endpoints used by IdP issuance and PDP decisions.
