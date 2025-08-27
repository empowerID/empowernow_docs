# Product — BFF: Spending Control for AI Providers

## Overview
The ARIA BFF is a drop‑in replacement for your existing provider proxy that upgrades runtime control without changing the external API surface (e.g., `/chat/completions`). It consumes PDP constraints, enforces caps while streaming, and settles receipts on completion.

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
- Works alongside the ARIA Gateway; both emit receipts to the Receipt Vault

CTAs: See streaming caps → View 402 behavior → Read receipts guide
