
## EmpowerNow Product and Services Understanding

### Executive summary
- EmpowerNow is an identity and authorization fabric designed for enterprise apps and AI agents. It unifies identity (IdP), policy decisions (PDP), runtime enforcement (ARIA Shield and ARIA MCP Gateway), a truth graph (Membership), and audit/assurance (Receipts), with orchestration that is AI‑native.
- Differentiators: standards-driven AuthZEN contract; agent Passports with plan contracts and schema pins; conservative constraint merging; runtime budget enforcement with clear 402 semantics; cryptographic receipt chains; MCP tool schema integrity; and a zero-token SPA pattern.
- Business outcomes: govern AI and API usage in real time; cut spend with budgets and caps; reduce regulatory risk with explainable decisions and receipts; ship faster via config-as-code and an extensible plugin/connector surface.

## Product suite overview

### ARIA MCP Gateway (MCP PEP)
- What it is: Policy enforcement at the agent→tool boundary for MCP/HTTP. Verifies ARIA Passports, enforces schema pins (Tool Registry), params/egress allowlists, and plan-step discipline. Emits signed receipts. Part of the ARIA Shield family.
- What it enforces:
  - Identity binding: pairwise `sub` and `act.sub`, optional DPoP roadmap.
  - Schema integrity: `{schema_version, schema_hash}` pins with rollout grace windows.
  - Params allowlists and egress allowlists.
  - Plan-step matching (JWS contract): `{tool, params_fingerprint}` per step.
  - Never returns 402; budgets are out of scope (owned by Provider Proxy).
- Why it matters: Stops unsafe or off-plan tool calls before execution, with verifiable proofs (receipts) and consistent constraints from PDP.

### ARIA Shield
- What it is: Session and security gateway for SPAs and AI chat. Terminates OAuth in the backend (no tokens in browser), issues httpOnly cookies, proxies `/api/...`, and enforces PDP mapping per route. Owns stream‑time caps and budget/402 semantics for providers.
- AI streaming control:
  - Enforces PDP constraints during streaming (`tokens.max_output`, `tokens.max_stream`).
  - Early stop with policy-based warnings; native SSE shape passthrough.
  - Idempotent budget holds/settles using `call_id`; 402 on exceed with clear behavior.
- Why it matters: Application-aware enforcement, enterprise observability, and a safe SPA model.

### PDP (Policy Decision Point, AuthZEN)
- What it is: Implements OpenID AuthZEN evaluation with rich context. Returns decision + normalized constraints and obligations, with TTL and versioning.
- Membership PIP at evaluation: enriches with `data_scope` (tenant/row filter), `step_up` (MFA), `identity_chain` (audiences/scopes/TTL), capability checks.
- Conservative merge model: intersections and minimums across layers keep effective constraints safe.
- Why it matters: Standard contract; consistent, explainable constraints across app and agent calls.

### IdP (Identity Provider, Agent Passports)
- What it is: Issues ARIA Passports via OAuth Token Exchange (RFC 8693) using RAR (RFC 9396). Encodes pairwise identities, actor chains, plan contracts, and schema pins; optional DPoP.
- Identity chaining (feature-gated): delegated assertion minting and brokered exchange to SaaS AS, gated by PDP constraints.
- Why it matters: Moves agent governance “left,” replacing API keys with purpose-built, verifiable credentials.

### Membership Graph (Neo4j, PIP)
- What it is: Authoritative graph for user→agent delegations, capabilities, budgets/max_steps, data-scopes, and identity-chaining eligibility. Exposed via fast PIP endpoints.
- Why it matters: One source of truth for issuance (IdP) and decisions (PDP), eliminating drift and enabling explainable, live context.

### Tool Registry
- What it is: Catalog of MCP/HTTP tools with CURRENT/pin semantics and ETag-friendly reads. Provides `{schema_version, schema_hash}` pins; supports signed pins.
- Why it matters: Prevents schema drift; enables safe rollouts and Passport embedding of pins.

### Receipt Vault
- What it is: Produces signed, hash‑chained receipts on permit from PEPs. Records policy snapshot/pin/params hashes, agent/call IDs, optional identity-chain digests, timestamps, and prev_hash.
- Why it matters: Tamper‑evident audit with cryptographic linking for compliance and forensics.

### Orchestration (Self‑Driving Workflows)
- What it is: AI‑native workflows that return next steps, decisions, and Mermaid diagrams for zero‑shot agent execution under policy.
- Why it matters: Agents safely navigate complex processes without bespoke training; humans and agents share a common visualization language; receipts ensure audit.

### Experience App (Unified portal)
- What it is: PDP‑aware runtime portal with CSP‑safe plugins; adapts via SSE/config; zero‑token SPA pattern via BFF.
- Why it matters: Presents the fabric as a coherent product surface; accelerates adoption.

### Supporting services
- NowConnect: hybrid connectivity (Azure Relay patterns) for on‑prem integrations.
- Analytics: receipt‑centric architecture (Kafka→ClickHouse→APIs) to analyze usage, spend, and constraints.
- SDKs: npm/python guides and index; cross-linked from service how‑tos.

## Value pillars (security and SaaS buyers)
- Authorization first: runtime enforcement of AuthZEN constraints across API, workflow, and agent calls.
- Agent identity you can trust: pairwise identities, actor chains, optional DPoP, plan contracts, schema pins.
- Governed spend: budgets, limits, and 402 semantics that are explainable and testable.
- Verifiable audit: signed, hash‑chained receipts with policy/shape fingerprints.
- Standards-aligned and interoperable: AuthZEN, OAuth TE (RFC 8693), RAR (RFC 9396), DPoP (RFC 9449), OIDC/SCIM/CAEP, MCP.
- Zero‑token SPAs: ARIA Shield pattern keeps tokens out of browsers while preserving developer ergonomics.

## Primary personas and outcomes
- Security Officers & Auditors: prove enforcement and compliance with receipts; explainable constraints; least‑privilege agent identity.
- DevOps & Platform: consistent route-level policy mapping; observability; safe rollouts via pins; config‑as‑code.
- Developers: simple `/api/...` proxying, clear PDP mapping, SDKs, and end‑to‑end quickstarts.
- Admins: tenant setup, IdP federation, client registration, and policy guardrails.
- Data/FinOps: live spend caps; per‑agent budgets; observable usage/limits.
- PMs/Executives: differentiated proposition for AI governance vs gateways, PDPs, and generic workflow tools.

## Canonical use cases
- Govern human and AI agent activity with real‑time authorization and spend limits.
- Zero‑trust SPA/API ingress with consistent logging and no browser tokens.
- Agent tool governance: schema pins, plan discipline, params/egress allowlists.
- Regulated workloads: verifiable audit chains supporting certifications and reviews.
- Hybrid integrations: secure on‑prem connectivity with policy‑governed operations.

## Architecture at a glance (flow)
1) IdP issues ARIA Passport (pairwise identity, plan JWS, schema pins, optional DPoP).
2) PEPs (ARIA MCP Gateway for tools; ARIA Shield for APIs/LLM) validate the Passport, call PDP.
3) PDP evaluates with Membership PIP, returning conservative, merged constraints and obligations.
4) PEP enforces: deny early; on permit, shape params/egress/stream caps; Provider Proxy holds/settles budgets.
5) Receipt Vault signs and chains a receipt per permit; Analytics ingests for reporting.
6) Tool Registry maintains schema pins; IdP and PEPs consult pins for integrity and rollout.

## Standards and compliance
- AuthZEN evaluation contract with constraints/obligations and TTL.
- OAuth Token Exchange (RFC 8693), RAR (RFC 9396), optional DPoP (RFC 9449).
- OIDC/SCIM/CAEP where applicable.
- MCP-aware tool governance (ingress normalization and pinning).
- FIPS references and observability endpoints available where documented.

## Differentiation highlights
- vs AI Gateways: EmpowerNow enforces plan/budget/egress/params with receipts; not just observability and caching. Clear 402 semantics on exceed.
- vs PDPs: Adds PEP enforcement (MCP-aware), schema pins, plan JWS discipline, budget streaming control, and receipt chains.
- vs Workflow tools: AI‑native orchestration outputs next paths, decisions, and Mermaid visuals; governance is built-in (identity + policy + PEP + receipts).

## Packaging and pricing considerations
- Studios (Authentication, Authorization, Automation, Inventory; Governance EA).
- Platform components (Experience App, ARIA Shield, PDP, NowConnect, Observability/Analytics).
- Pricing aligns to platform usage with policy-governed spend control; ensure public copy links to Reference pages rather than duplicating configuration tables.

## Interoperability and SDKs
- Multi-provider support; constraints originate in PDP, not provider configs.
- npm/python SDKs documented under `sdks/*`; cross-linked from how‑tos.

## Deployment and operations
- BFF: routes.yaml, ForwardAuth, health/metrics, streaming/SSE controls.
- PDP: decision TTL and events; runbooks for degraded/error handling; Kafka topics.
- IdP: DCR, scopes/audiences, discovery, JWKS; identity-chaining endpoints.
- Observability: OTEL/Prometheus/Loki/Grafana/Jaeger; logs/metrics/traces references.
- Hybrid ops: NowConnect Azure Relay patterns.
- Receipts: signing/anchoring options; export to analytics.

## Proof points to emphasize
- Idempotent budget debits by `call_id` with clear 402 behavior.
- Conservative, deterministic merge model for constraints and obligations.
- Hash‑chained receipts capturing policy and schema fingerprints.
- Schema pins with grace windows and ETag-friendly reads.
- Zero‑token SPAs via BFF; PDP mapping per route; SSE pre-checks and enforcement during streaming.

## Risks and roadmap notes
- ARIA Shield index is a placeholder; deep technical content exists in subpages (controls, receipts, attestation). Keep marketing high-level and link to service docs.
- PDP reference expansion (flags/APIs) is underway; ensure website/marketing link to service Reference, not inline tables.
- Continue consolidating configuration tables into `reference/*` per service and add deep links.

## Messaging guidance (external)
- Lead with “Authorization and runtime enforcement for AI and APIs” (not “observability”).
- Anchor on standards and verifiable controls (Passports, pins, receipts).
- Highlight zero-token SPAs, policy-governed budgets, and cryptographic audit.
- Use website product pages for high-level benefits; link to `services/*/reference/*` for configuration.

## Content governance (Diátaxis alignment)
- Tutorials: onboarding and end-to-end flows; link to how‑tos and references at each step.
- How‑tos: step-by-step tasks; never carry config tables—link to reference anchors.
- Reference: single source of truth for settings, flags, APIs.
- Explanation: concepts, architecture, trade-offs; TL;DR and “See also” at top.

### CTAs mapping
- For security/compliance: Receipts overview → ARIA Shield controls → PDP operator/merge model.
- For developers: SPA Golden Path → BFF config/routing → PDP mapping → Streaming caps.
- For platform/DevOps: Health/metrics → Observability → Reference settings → NowConnect.
- For AI teams: Agent Passports (IdP) → MCP gateway enforcement → Orchestration zero‑shot flows.

---

- I synthesized the understanding doc grounded in the `services/*`, `website_copy/*`, and `marketing/*` sources and kept canonical technical details in Reference scope. If you want, I can convert this into `marketing/one-pager.md` and add cross-links to the relevant service pages.