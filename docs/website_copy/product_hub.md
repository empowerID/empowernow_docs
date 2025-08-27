# Product — ARIA Overview

## What is ARIA
EmpowerNow ARIA is the Identity Fabric and Self‑Driving Workflows platform for AI agents. It unifies:
- Identity: ARIA Passports with RAR, DPoP, pairwise identities, plan JWS, and schema pins
- Authorization: AuthZEN‑native decisions with constraints/obligations, enriched by Membership
- Enforcement: MCP‑aware PEP + BFF spend control (schema/params/egress, plan/budgets, receipts)
- Truth Graph: Neo4j Membership service for delegations, capabilities, budgets/max_steps, eligibility
- Orchestration: No‑code agent tools and Self‑Driving Workflows with zero‑shot execution and AI‑native diagrams

## Standards Alignment
- AuthZEN — Authorization API evaluation endpoints (/evaluation, /evaluations)
- OAuth Token Exchange (RFC 8693) — user→agent delegation with `act.sub`
- RAR (RFC 9396) — authorization_details for tool/capability requests and schema pins
- DPoP (RFC 9449) — optional proof‑of‑possession binding (`cnf.jkt`)
- MCP — Model Context Protocol for agent↔tool interactions

## Components
- IdP — Agent Passports
- PDP — AuthZEN + Membership PIP
- ARIA Gateway (MCP PEP)
- BFF Spending Control
- Tool Registry
- Receipt Vault
- Orchestration — Self‑Driving Workflows
- Membership Graph

## Why ARIA (vs alternatives)
- “AI gateways” focus on observability and cost estimation; ARIA enforces plan/budgets at runtime, before tools execute.
- Policy engines provide decisions; ARIA adds an MCP‑aware PEP, receipts, and a no‑code orchestration layer.
- Workflow tools orchestrate tasks; ARIA is AI‑native (zero‑shot responses, LLM‑oriented next paths, Mermaid diagrams) and governed by AuthZEN + Membership.

CTAs: Book a demo · Read the docs · Explore Orchestration
