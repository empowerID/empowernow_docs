---
title: Naming Service One‑Pager
description: Overview, benefits, and enterprise integration talking points.
---

What it does:

- Generates enterprise‑grade usernames, emails, display names with YAML policies, Jinja templating, and plugin strategies
- Guarantees uniqueness with progressive fallback; robust international character handling (40+ languages)
- Pure transformation service (no provisioning) with REST API and audit trails

Why it matters for IGA:

- Eliminates naming conflicts and manual intervention in provisioning
- Ensures consistent, compliant naming across AD, email, and apps
- Fits any IGA platform; bulk and migration friendly

Fabric fit:

- Consumed by Automation/Inventory workflows; policies version‑controlled; monitored via OTEL/Prometheus; events to Kafka/Analytics

## How it fits (visual)

```mermaid
flowchart LR
  subgraph Studios
    Auto[Automation Studio]
    Inv[Inventory Studio]
  end
  BFF[BFF]
  Studios --> BFF
  NS[Naming Service]
  BFF --> NS

  subgraph DataPlane["Data Plane Services"]
    CRUD["CRUD Service (workflows)"]
    DC["Data Collector (inventory)"]
  end
  BFF --> CRUD
  BFF --> DC

  NS --> K[Kafka]
  CRUD --> K
  DC --> K
  K <--> CH[ClickHouse]
```



