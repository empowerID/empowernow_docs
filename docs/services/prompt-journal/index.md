---
title: Prompt Journal
description: Privacy‑first journaling of masked prompts with optional raw modes under policy and consent.
---

Prompt Journal stores masked prompts as the system of record, emits sanitized events to ClickHouse, and optionally persists raw fragments/blobs with strict governance.

```mermaid
flowchart LR
  BFF --> PJ[Prompt Journal]
  PJ --> K[Kafka (sanitized)]
  K --> CH[ClickHouse]
```

See also: `services/bff/reference/BFF_PDP_Enforcement.md`, `services/analytics/index.md`.

