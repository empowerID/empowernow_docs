---
title: Dynamic AI Model Routing — How It Works
tags: [service:bff, area:llm, feature:dynamic-model-routing]
---

## Overview

Dynamic Model Routing lets the BFF transparently select an allowed, affordable LLM model when the requested model is disallowed by policy or unaffordable given live budgets. v1 covers model selection within one provider (OpenAI); v2 adds provider switching.

## How it works (v1)

1) BFF receives a chat request with `model`.
2) PDP returns `constraints` (model/tokens/egress) and optional `spend_snapshot`.
3) Preflight applies prompt guard, masking, token clamps.
4) Budget hold based on estimated cost.
5) If denied (policy/budget), BFF tries allowed candidates cheapest-first, re-evaluating PDP with `estimated_cents` until one is allowed.
6) Egress is re-pinned; request proceeds; receipt emitted.

## Key properties

- PDP-first: BFF never bypasses policy
- Budget-aware: evaluates candidates against live budgets
- Transparent: `x-aria-model-selected`, `x-aria-model-rerouted` headers

## Real scenarios

- Hit monthly cap on `gpt-4.1` → reroute to `gpt-4o-mini`
- Tenant allows only `gpt-4o-mini` → requests for `gpt-4.1` are routed to `gpt-4o-mini`

## Algorithm details (v1)

```mermaid
flowchart TD
  A[Request model M0] --> B{PDP allow M0?}
  B -- Yes --> C[Preflight + Egress]
  B -- No --> D{Budget/Policy?}
  D -- Policy Only --> Z[403]
  D -- Budget or Combined --> E[Candidates = allow ∩ known]
  E --> F[Sort by estimated cost]
  F --> G{Loop candidates}
  G -->|allow| H[Select; Preflight + Egress]
  G -->|deny| F
  H --> I[Budget HOLD]
  I -->|ok| J[Call]
  I -->|no| F
```

## Roadmap (v2)

- Provider switching (OpenAI ⇄ Anthropic ⇄ Ollama) with PDP Search shortlist, ranking, and receipts.

See also: Tutorials → LLM Routing Quickstart; Reference → LLM Routing Config, LLM Routing PDP.


