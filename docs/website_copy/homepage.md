# Homepage Copy

## Hero
Make AI agents safe, affordable, orchestrated, and auditable

EmpowerNow ARIA mints verifiable agent identities, authorizes with AuthZEN, enforces at the boundary, and adds Self‑Driving Workflows so agents can execute no‑code tools and workflows with zero prior context—governed end‑to‑end with cryptographic receipts.

CTAs: Book a demo · Try the quickstart · Watch the 10‑min demo

Standards: AuthZEN · OAuth Token Exchange (RFC 8693) · RAR (RFC 9396) · DPoP (RFC 9449) · MCP

## Pillars
- Identity (IdP): Mint ARIA Passports with RAR, DPoP, and pairwise identities. Embed plan JWS, tool schema pins, and policy‑gated identity chaining so agents carry least‑privilege context from the start.
- Authorization (PDP): AuthZEN‑native decisions with constraints and obligations. Enrich every evaluation with Membership graph data—data_scope, step‑up, and identity‑chain allowlists—for consistent, explainable policies.
- Enforcement (Gateways): MCP‑aware PEP and BFF spending control at runtime: schema pin checks, params and egress allowlists, plan‑step verification, idempotent budgets, and signed receipts after each action.
- Truth Graph (Membership): Delegations, capabilities, budgets/max_steps, and SaaS eligibility in Neo4j. The single source of truth that both IdP and PDP consult for issuance and decisions.
- Orchestration (Self‑Driving Workflows): No‑code agent tools and Self‑Driving Workflows with zero‑shot execution. LLM‑native Next Path Generation, node‑centric decisions, AI‑native Mermaid diagrams, and enhanced responses that guide agents safely.

## Architecture Snapshot
IdP issues ARIA Passports (RAR, plan JWS, schema pins, optional DPoP) → ARIA Gateway/BFF enforce constraints at runtime and call tools → PDP (AuthZEN) returns decision + constraints/obligations, enriched by Membership graph → Receipt Vault signs and chains receipts → Tool Registry serves schema version/hash with rollout windows.

Why it matters: A standard PEP/PDP contract (AuthZEN) with graph‑backed context and boundary enforcement creates consistent, auditable control over agent actions across tools and providers.

## Demo Strip
- Deny before call (PDP): Evaluate agent→tool with PDP. Capability not granted? Decision = deny. Gateway blocks pre‑execution and logs reason. CTA: See evaluation example
- Budget cap enforced (BFF): Budget debit fails gracefully with 402. Client receives a clear reason; a signed receipt records the event. CTA: View receipt schema
- Zero‑shot workflow (Orchestration): Start a workflow with minimal input. Response includes mermaid_full, next_paths, node‑specific options, and ai_context—so agents proceed safely without prior training. CTA: See response specimen

## Outcomes by Role
- CISO/Security: Pre‑execution denies; egress allowlists; data_scope and step‑up; signed, hash‑chained receipts; optional DPoP binding at issuance.
- CFO/FinOps: Enforce per‑agent budgets and plan steps; 402 behavior with receipts for reconciliation; visibility without over‑spend risk.
- Platform/Infra: Standards‑aligned (AuthZEN, OAuth TE/RAR/DPoP, MCP); decision cache; ETag’d registry; drop‑in gateway/BFF.
- DevSecOps: Policy‑driven constraints; MCP‑aware PEP; receipts tee to analytics; testable contracts and quickstart.

## Integrations
- LLM/model providers and HTTP APIs via MCP/REST
- SaaS tools cataloged and pinned in Tool Registry
- Observability/analytics sinks for receipts and events

## Trust & Compliance
- DPoP‑bound issuance and pairwise subjects reduce replay and linkability.
- Graph‑derived constraints (data_scope, step_up, identity_chain) centralize governance.
- Signed, hash‑chained receipts with policy snapshots and params hashes enable end‑to‑end auditability.

## CTAs
- Book a demo (primary)
- Try the quickstart (compose)
- Watch the 10‑min demo
- Read the whitepaper
- Explore the Orchestration guide
