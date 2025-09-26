---
product: shield
name: "ARIA Shield — Zero-Token SPA & AI Gateway"
status: draft
owner: Product Marketing
personas: [Developers, Platform Engineering, Security Leader, AI Team]
primary_outcome: "Keep tokens out of the browser while enforcing budgets, streaming limits, and policy at runtime."
proof_tags: [zero_token_spa, budget_enforcement, 402_semantics, stream_caps, pdp_mapping, receipt_chain]
lastReviewed: 2025-09-26
---

## One-liner

A BFF security gateway that terminates OAuth in the backend (no browser tokens), maps routes to PDP policy, enforces budgets/402 and streaming limits, and emits receipts.

## Problem

- Browser tokens leak; gateways observe but rarely enforce budgets/streams.
- Auditors want proof that constraints were applied in real time.

## Architecture at a glance

```mermaid
flowchart LR
  FE[SPA] --> BFF[ARIA Shield]
  BFF --> PDP
  BFF --> Prov[Provider APIs]
  PDP --> RCPT[Receipts]
```

## How it works

1. Backend OAuth; httpOnly cookies; /api/* proxy.
2. PDP mapping per route; enforce constraints, streaming caps.
3. Budget hold/settle via call_id; receipt on permit.
→ See `../../../services/aria-shield/index.md`.

## Proof Library

- Zero-token explainer → `../../../services/aria-shield/explanation/zero-token.md`
- Budget semantics → `../../../services/aria-shield/explanation/budgets.md`

## See also

- Website page → `../../../website_copy/product_bff.md`

