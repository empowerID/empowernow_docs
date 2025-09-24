---
title: Analytics
description: Receipt‑centric ingest, runtime budgets, and hot state for AI spend and integrity.
---

## Overview

Analytics ingests signed receipts from BFF and ARIA Gateway, verifies integrity, derives spend, and serves runtime budgets/state for UIs and tripwires. It keeps Redis for hot counters and exposes simple HTTP APIs.

```mermaid
flowchart LR
  subgraph Producers
    BFF
    ARIA[ARIA Gateway]
  end
  subgraph Analytics
    API
    Redis[(Redis: hot)]
  end
  BFF -->|POST receipts:batch| API
  ARIA -->|POST receipts:batch| API
  API <--> Redis
  API -->|GET budgets/state| UI[UIs / PDP PIP]
```

### What it provides
- Receipt ingest (`/api/v1/analytics/receipts:batch`)
- Runtime budgets (`/api/v1/analytics/budgets/*`)
- Hot spend counters (`/api/v1/analytics/runtime/hot`)

### See also
- BFF bridging how‑to: `services/bff/how-to/analytics-audience-bridged-via-bff.md`
- PDP Effective Budgets: `services/pdp/reference/effective-budgets.md`

