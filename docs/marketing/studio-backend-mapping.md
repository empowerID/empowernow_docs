---
title: Studios ↔ Backends Mapping
description: Clear mapping of Studios (frontends) to the backend services they productize.
---

- Authentication Studio → IdP (OIDC/OAuth2) + BFF (session termination & proxy)
- Authorization Studio → PDP (OpenID AuthZEN)
- Automation Studio → CRUD Service (workflow/CRUD engine, Secrets Platform)
- Inventory Studio → DataCollector (connectors, diffing, PDP‑gated deltas)
- Governance Studio (EA) → Campaigns/reviews service (roadmap)
- Shared services → Analytics (Kafka→ClickHouse), Observability (OTEL/Prometheus/Loki/Grafana/Jaeger), NowConnect, Membership (Neo4j)

## Visual mapping

```mermaid
flowchart TB
  subgraph UI["Studios (React)"]
    S1["Authentication Studio"]
    S2["Authorization Studio"]
    S3["Automation Studio"]
    S4["Inventory Studio"]
  end

  BFF["BFF (session terminator & proxy)"]
  UI --> BFF

  subgraph Control["Control Plane"]
    IdP["IdP (OIDC)"]
    PDP["PDP (OpenID AuthZEN)"]
  end
  BFF --> IdP
  BFF --> PDP

  subgraph Data["Data Plane Services"]
    CRUD["CRUD Service\n(YAML system definitions)"]
    DC["Data Collector\n(YAML system definitions)"]
    NAM["Naming Service"]
    ANA["Analytics API"]
  end
  BFF --> CRUD
  BFF --> DC
  BFF --> NAM
  BFF --> ANA

  subgraph NC["NowConnect"]
    NCC["Cloud Hub"]
    NCP["Premise Agent(s)"]
  end
  CRUD --> NCC
  DC   --> NCC
  NCC <--> NCP
```


