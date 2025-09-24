---
title: Architecture & Privacy Modes
---

Prompt Journal supports three privacy modes picked by policy (constraints) and obligations (consent/DLP):
- Strict (Sanitized): masked text only; sanitized events to Kafka/ClickHouse
- Balanced (Field‑level Raw): masked + selected encrypted fields; sanitized events only
- Full‑Fidelity (Raw): encrypted blob pointers; sanitized events only by default

```mermaid
flowchart TB
  subgraph Control
    PDP
    IdP[Consent UI]
  end
  subgraph Data
    BFF
    PJ[Prompt Journal]
    K[Kafka (sanitized)]
    CH[ClickHouse]
  end
  BFF -->|mode from policy| PJ
  PJ -->|sanitized events| K --> CH
  IdP -. consent .- BFF
```

See also
- BFF enforcement: `services/bff/reference/BFF_PDP_Enforcement.md`
- Analytics budgets: `services/analytics/index.md`

