---
title: Tool Registry
description: Catalog of MCP/HTTP tools with schema pins, atomic rollouts, grace windows, ETags, and optional signed pins.
---

The Tool Registry provides a hash‑pinned interface to tools so the control plane can verify schema integrity and perform safe rollouts.

```mermaid
flowchart LR
  subgraph ControlPlane
    IdP[IdP (RAR/PAR/JARM/OBO)]
    PDP
    REG[Tool Registry]
    RV[Receipt Vault]
  end
  subgraph DataPlane
    ARIA[ARIA Gateway]
    BFF
    TOOLS[Tools]
  end
  IdP -->|pin fetch| REG
  ARIA -->|GET /tools/{id}| REG
  ARIA --> TOOLS
  ARIA --> RV
  BFF --> RV
```

See also
- Tool schema attestation: `services/aria-shield/tool-schema-attestation.md`

