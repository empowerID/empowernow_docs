# Product Comparison — Where ARIA Fits

## ARIA vs. “AI Gateways”
- Focus
  - Gateways: observability (requests/tokens/errors), caching, retries, rate limits; cost is often estimated.
  - ARIA: authorization and enforcement at runtime (AuthZEN PEP), plus plan/budget gating, egress/params allowlists, and cryptographic receipts.
- Identity
  - Gateways: typically no user‑bound agent identity on‑wire.
  - ARIA: ARIA Passports with pairwise identities, `act.sub`, optional DPoP binding.
- Control
  - Gateways: cannot enforce per‑agent plan or budget prior to tool execution.
  - ARIA: denies before tool calls; idempotent budget debits with clear 402 behavior.

## ARIA vs. Authorization Engines (PDP/ABAC/RBAC)
- Scope
  - PDPs provide policy decisions; orchestration and runtime shaping are out of scope.
  - ARIA: AuthZEN‑profiled decisions plus an MCP‑aware PEP that enforces schema pins, params/egress, plan/budgets, and receipts.
- Context
  - Standalone PDPs need rich, consistent context.
  - ARIA: integrates a Membership graph PIP (delegations, data_scope, step_up, identity_chain) for authoritative context.

## ARIA vs. Workflow Tools
- Model
  - Workflow tools orchestrate tasks for humans or services with fixed UIs.
  - ARIA Orchestration is AI‑native: zero‑shot responses, LLM‑native next paths, node‑centric decisions, and Mermaid diagrams that agents can interpret.
- Governance
  - Generic tools lack AuthZEN integration and agent identity controls.
  - ARIA: identity + policy + PEP enforcement + receipts underpin workflows end‑to‑end.

## Why ARIA
- A unified fabric: Identity, Authorization, Enforcement, Truth Graph, and Orchestration designed specifically for AI agents.
- Standards‑aligned: AuthZEN, OAuth Token Exchange (RFC 8693), RAR (RFC 9396), DPoP (RFC 9449), MCP.

CTAs: Book a demo · Read the docs · Explore Orchestration
