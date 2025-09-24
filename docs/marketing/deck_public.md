---
title: ARIA v1 — Public Deck (Sanitized)
description: Executive overview and canonical links. Technical details live in the service docs.
---

## TL;DR
- Govern AI agents with seven controls: identity, capability, plan, context, attestation, behavior, receipts.
- Enforce at the edges that matter: ARIA MCP Gateway (MCP PEP) and ARIA Shield (provider proxy) with a central PDP.
- Prove outcomes with signed, hash‑chained receipts and structured audit.

## What this page is
A concise, public‑safe narrative with canonical links. The deep technical details (flags, SLOs, configs) are in the service docs.

## Why ARIA
- Predictable, private, provable agent operations.
- Budget controls and plan discipline reduce spend risk.
- Centralized, explainable authorization via AuthZEN and Membership graph.

## How it works (at a glance)
- IdP issues Passports (RAR + ARIA extensions) for user‑bound agents.
- PDP evaluates AuthZEN requests and returns constraints/obligations.
- ARIA MCP Gateway and ARIA Shield enforce constraints before tools/providers execute.
- Receipt Vault signs/anchors receipts for audit and analytics.

## See also (canonical docs)
- Gateway (MCP PEP): `/docs/website_copy/product_gateway`
- ARIA Shield (provider proxy): `/docs/website_copy/product_bff`
- PDP overview: `/docs/website_copy/product_pdp` and flags: `/docs/services/pdp/reference/settings-flags`
- Budgets: `/docs/services/pdp/reference/effective-budgets`
- Controls reference: `/docs/services/aria-shield/reference/controls`
- Receipts (technical): `/docs/services/aria-shield/receipt-chains`
- Membership schema & endpoints: `/docs/services/membership/reference/schema-and-endpoints`
- IdP Passports: `/docs/website_copy/product_idp`
- Protect third‑party apps: `/docs/services/bff/explanation/bff_gateway`

## For deeper dives
- Prompt analytics: `/docs/marketing/loopback-mcp/landing` and `/docs/services/crud-service/reference/mcp_api_reference`
- SDKs: `/docs/sdks/index`

## Notes
- Internal SLOs, flags, and runbooks are intentionally not duplicated here. Link to the references above.
