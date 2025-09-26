---
title: Research Taxonomy
---

# Research taxonomy and CI

This folder defines the controlled vocabulary and JSON schema used across competitor research, briefs, and website copy.

## Components

- `claims_vocabulary.json`: Allowed capability and business-claim keys with labels and descriptions.
- `claims.schema.json`: JSON Schema applied to `marketing/research/competitors/*.json`.

## Flow (Mermaid)

```mermaid
flowchart LR
  A[Sources: vendor sites, docs, pricing, releases, talks, GitHub] --> B[Evidence harvest]
  B --> C[Normalize → capabilities[] + claims[]]
  C --> D[competitors/<product>/*.json \n (claims.schema.json)]
  D --> E[Briefs (persona/solution/product)]
  E --> F[gen-www-from-briefs.ts]
  F --> G[docs/website_copy/* pages]
  D --> H[research-lint.mjs CI]
  G --> I[copy-lint CI (proof links, freshness, no tables)]
```

## Validation

- Evidence entries must include a valid URL; quotes ≤ 200 chars.
- Capabilities and business claims must match keys in `claims_vocabulary.json`.
- `lastFetched` should remain ≤ `stalenessDays` (CI blocks if stale).


