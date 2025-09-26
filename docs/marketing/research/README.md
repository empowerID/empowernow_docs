---
title: Marketing Research Spine
---

# Marketing research spine

Folder layout:

```
research/
  competitors/<product>/<vendor>.json
  serp/<product>.csv
  velocity/<product>.md
  pricing/<product>.md
  analysts/<product>.md
  templates/{competitor.json, serp.csv}
  taxonomy/{claims_vocabulary.json, claims.schema.json}
```

## Process (Mermaid)

```mermaid
flowchart TB
  subgraph Inputs
    I1[Vendors\nDocs\nPricing]
    I2[Releases\nBlogs\nGitHub]
    I3[Analyst\nMedia]
    I4[SERP]
  end
  I1 --> H[Harvest]
  I2 --> H
  I3 --> H
  I4 --> H
  H --> N[Normalize → vocabulary]
  N --> J[competitors/*.json]
  J --> L[Lint (staleness/evidence/schema)]
  J --> B[Briefs]
  B --> G[Generated WWW pages]
```


