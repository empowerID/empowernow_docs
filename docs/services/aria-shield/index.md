---
title: ARIA Shield
description: Placeholder index for the ARIA Shield service. Overview, purpose, and links to future how‑to, explanation, and reference docs.
---

## Overview

ARIA Shield is the runtime enforcement product for SPAs and AI providers (formerly BFF). It enforces stream‑time caps, leakage guards, and budget/402 semantics under PDP constraints. It is complemented by the ARIA MCP Gateway for agent→tool enforcement.

## What to expect here

- Explanation: concepts, architecture, and threat model
- How‑to: common tasks and integrations
- Reference: APIs, configuration, and operations

## Related

- Services overview: /docs/services/index
- Marketing overview: /docs/marketing/index
- ARIA Shield (formerly BFF):
  - Explanation: /docs/services/bff/explanation/llm-dynamic-model-routing
  - How‑to (Budgets): /docs/services/bff/how-to/llm-routing-budgets
  - Reference (Config): /docs/services/bff/reference/llm-routing-config
  - Reference (PDP): /docs/services/bff/reference/llm-routing-pdp
- ARIA MCP Gateway:
  - Index: /docs/services/mcp-gateway/index

## Guides & specs

- Patent portfolio: [ARIA Patent Portfolio – Attorney Brief](/docs/services/aria-shield/patent-portfolio)
- PM overview (no‑code): [ARIA — Agent Risk & Identity Authorization](/docs/services/aria-shield/pm-overview)
- PM exec overview: [ARIA – Product Management Overview](/docs/services/aria-shield/pm-executive-overview)
- Seven controls (plain language): [ARIA’s Seven Controls](/docs/services/aria-shield/seven-controls-overview)
- Deep dives:
  - [Tool Schema Attestation](/docs/services/aria-shield/tool-schema-attestation)
  - [Privacy‑Preserving Capability Proofs](/docs/services/aria-shield/capability-proofs)
  - [Behavioral DNA (BDNA) Monitoring](/docs/services/aria-shield/bdna-monitoring)
  - [Receipt Chains (Immutable Audit)](/docs/services/aria-shield/receipt-chains)
- Architecture & profile: [ARIA – Intro & Architecture](/docs/services/aria-shield/intro-architecture)
- Placeholder (TBD): [Guide 3](/docs/services/aria-shield/pm-guide3-tbd)


## Competitive notes

- SPA security: Curity’s Token Handler positions an OAuth agent + API gateway proxy issuing secure HTTP‑only cookies and translating them to tokens at the gateway. Source: [Curity Token Handler](https://curity.io/product/token-handler/)
- Our positioning: ARIA Shield + ARIA MCP Gateway with centralized PDP mapping, SSE pre‑checks, per‑service token brokering, and enterprise observability. See: `marketing/competitive.md` and `services/bff/explanation/bff_gateway.md`.

