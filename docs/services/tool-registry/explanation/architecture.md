---
title: Architecture & Flows
---

V1 provides a catalog of tools with hash‑pinned schemas, atomic CURRENT flips, rollout grace windows, and ETag‑friendly reads. IdP embeds pins in ARIA passports; ARIA verifies pins before egress.

```mermaid
sequenceDiagram
  participant ADM as Tool Admin
  participant REG as Tool Registry
  participant IDP as IdP
  participant AR as ARIA Gateway
  participant TL as Tool
  ADM->>REG: POST versions (schema v1.2.0)
  ADM->>REG: POST rollout {schema_version}
  IDP->>REG: GET /tools/{id}
  REG-->>IDP: {schema_version, schema_hash, ...}
  AR->>REG: GET /tools/{id} (ETag cached)
  REG-->>AR: current + previous + grace_seconds
  AR->>TL: forward after pin check
```

Principles
- One CURRENT version per tool (atomic pointer)
- Deterministic `schema_hash` from canonical JSON
- `grace_seconds` allows previous version acceptance during rollout
- ETag + Cache‑Control for efficient reads

See also
- Index: `services/tool-registry/index.md`

