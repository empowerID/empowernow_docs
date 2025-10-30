# Product Components — Cards

IdP — Agent Passports
- Issue ARIA Passports via OAuth Token Exchange (RFC 8693) with RAR (RFC 9396).
- Embed plan JWS and schema pins; optional DPoP binding (RFC 9449) and pairwise subjects.
- Policy‑gated identity chaining endpoints.

PDP — AuthZEN + Membership PIP
- Standard evaluation (/access/v1/evaluation) returning decision + constraints/obligations.
- Membership‑powered constraints: data_scope, step_up, identity_chain allowlists.

ARIA MCP Gateway (MCP PEP)
- Enforce schema pins, params allowlists, and egress allowlists before tool calls.
- Validate plan steps and execute obligations (receipts, analytics). Budgets are enforced by ARIA Shield.

ARIA Shield (formerly BFF)
- Stream‑time token caps and leakage guards; 402 budget_exceeded behavior with receipts.
- Provider‑compatible API surface for minimal app changes.

Orchestration Service
- Workflow execution and service layer; policy‑guarded automation; resume/approvals.

Data Collector
- No‑code connectors and inventory ingestion; PDP‑gated deltas; visual diffs.

VDS (Virtual Directory Server) — Coming soon
- Standards‑based virtual directory layer for directory consolidation and policy‑aware views.

Bundled components
- Tool Registry (with ARIA MCP Gateway): CURRENT/pins with rollout windows
- Membership Graph (with PDP): delegations, data_scope, step_up, identity_chain
- Receipt Vault (Pro/Enterprise): signed, hash‑chained receipts
