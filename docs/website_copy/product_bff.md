---
lastReviewed: 2025-09-26
claims:
  - { key: zero_token_spa, proof: { type: reference, ref: "/docs/services/aria-shield/explanation/zero-token.md" } }
  - { key: budget_enforcement, proof: { type: reference, ref: "/docs/services/aria-shield/explanation/budgets.md" } }
  - { key: 402_semantics, proof: { type: reference, ref: "/docs/services/pdp/reference/effective-budgets.md" } }
  - { key: stream_caps, proof: { type: reference, ref: "/docs/services/bff/reference/streaming.md" } }
  - { key: receipt_chain, proof: { type: reference, ref: "/docs/services/aria-shield/reference/receipts.md" } }
---
# Product — ARIA Shield (formerly BFF)

## Overview
ARIA Shield (formerly BFF) is a drop‑in replacement for your existing provider proxy that upgrades runtime control without changing the external API surface (e.g., `/chat/completions`). It consumes PDP constraints, enforces caps while streaming, and settles receipts on completion.

## Stream‑time enforcement
- Live token/output caps from PDP (`tokens.max_output`, `tokens.max_stream`) guide the streaming loop
- Early stop with policy‑driven warning when limits are reached
- Preserves provider‑native SSE shape to the client

## Leakage guards (optional)
- Rails injection (system prefix/suffix) to constrain model behavior
- Redaction of sensitive content in prompts before logging/receipt hashing

## Budget hold/settle
- Per‑agent budget is debited idempotently using `call_id` at invocation time
- On retries, additional debits are 0; on exceed, return `402 budget_exceeded`
- On success, a signed, hash‑chained receipt is emitted (policy snapshot, schema hash, params hash)

## Interoperability
- Compatible with multiple providers; constraints come from the PDP, not provider‑specific configuration
- Works alongside the ARIA MCP Gateway; both emit receipts to the Receipt Vault

CTAs: See streaming caps → View 402 behavior → Read receipts guide

## See also
- Streaming and caps: `services/bff/reference/streaming.md`
- Settings: `services/bff/reference/settings-reference.md`
- Logging and observability: `services/bff/reference/logging-reference.md`, `services/bff/reference/observability.md`
- 402 behavior and budgets: `services/pdp/reference/effective-budgets.md`
- Receipts: `services/aria-shield/receipt-chains.md`

## How we compare
- Curity’s Token Handler secures SPAs using HTTP‑only cookies and an OAuth agent + API gateway proxy. For a deeper comparison and positioning, see the competitive page. Source: [Curity Token Handler](https://curity.io/product/token-handler/)
- Our approach is an application‑aware BFF behind Traefik with centralized PDP mapping, per‑service token brokering, SSE pre‑checks, and enterprise observability. See: `services/bff/explanation/bff_gateway.md`

Learn more: `marketing/competitive.md`