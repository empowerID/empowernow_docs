---
id: index
title: EmpowerNow Identity Fabric – Suite Overview
description: High-level overview of the EmpowerNow Identity Fabric, including ingress, identity, policy, data services, eventing, analytics, and observability. Includes a system diagram and core hostnames.
---

The EmpowerNow Identity Fabric is a modular suite that provides identity, policy, workflow/CRUD execution, eventing, analytics, and observability. This page shows how the pieces fit together end‑to‑end.

```mermaid
flowchart LR
  %% Edge
  subgraph edge["Edge (Browsers & SPAs)"]
    SPA1["authn.ocg.labs.empowernow.ai (IdP UI)"]
    SPA2["authz.ocg.labs.empowernow.ai (Policy UI)"]
    SPA3["automate.ocg.labs.empowernow.ai (Workflow UI)"]
    SPA4["frontend.ocg.labs.empowernow.ai"]
    SPA5["runner.ocg.labs.empowernow.ai"]
  end

  %% Ingress
  subgraph ingress["Ingress"]
    TRAEFIK["Traefik"]
  end

  SPA1 --> TRAEFIK
  SPA2 --> TRAEFIK
  SPA3 --> TRAEFIK
  SPA4 --> TRAEFIK
  SPA5 --> TRAEFIK

  %% Control plane
  subgraph control["Control Plane"]
    BFF["BFF (Session terminator, proxy)"]
    IDP["IdP (OIDC, CAEP, MCP)"]
    PDP["PDP (Authorization)"]
    REDIS[(Shared Redis)]
  end

  TRAEFIK --> BFF
  BFF <--> REDIS
  BFF --> IDP
  BFF --> PDP

  %% Data plane services
  subgraph data["Data Plane Services"]
    CRUD["CRUD Service"]
    NAMING["Naming Service"]
    MEMBERSHIP["Membership Service"]
  end

  %% Data stores
  subgraph stores["Primary Data Stores"]
    POSTGRES[(PostgreSQL)]
    NEO4J[(Neo4j)]
    LDAP[(OpenLDAP)]
  end

  %% Eventing & analytics
  subgraph eventing["Eventing"]
    KAFKA["Kafka"]
    KAFDROP["Kafdrop"]
  end

  subgraph analytics["Analytics"]
    ANALYTICS["Analytics Service"]
    CLICKHOUSE[(ClickHouse)]
  end

  %% Observability
  subgraph obs["Observability"]
    OTEL["OTel Collector"]
    PROM["Prometheus"]
    GRAF["Grafana"]
    LOKI["Loki"]
    JAEGER["Jaeger"]
    VECTOR["Vector"]
  end

  %% BFF as gateway to backends (audience tokens)
  BFF --> CRUD
  BFF --> MEMBERSHIP
  BFF --> NAMING
  BFF --> ANALYTICS
  BFF -. OIDC tokens .-> IDP

  %% Service ↔ store relationships
  CRUD --> POSTGRES
  MEMBERSHIP --> NEO4J
  IDP --> LDAP

  %% Event flows
  CRUD -- business/error events --> KAFKA
  PDP -- authz events/metrics --> KAFKA
  IDP -- security/CAEP --> KAFKA
  ANALYTICS -- consumes --> KAFKA
  ANALYTICS <--> CLICKHOUSE

  %% Observability flows (simplified)
  BFF -. OTLP .-> OTEL
  CRUD -. OTLP .-> OTEL
  PDP -. OTLP .-> OTEL
  IDP -. OTLP .-> OTEL
  ANALYTICS -. OTLP .-> OTEL
  BFF -. /metrics .-> PROM
  CRUD -. /metrics .-> PROM
  PDP -. /metrics .-> PROM
  IDP -. /metrics .-> PROM
  ANALYTICS -. /metrics .-> PROM
  VECTOR --> LOKI
  OTEL --> JAEGER
  GRAF --- PROM
  GRAF --- LOKI
  GRAF --- JAEGER

  %% Utilities
  KAFDROP --- KAFKA
```

### Key roles at a glance

- BFF: Terminates SPA sessions; proxies to backends using audience‑bound access tokens minted by the IdP.
- IdP: OIDC provider (tokens, introspection); emits CAEP/security events; exposes MCP.
- PDP: Central authorization decisions; emits authz events/metrics.
- CRUD Service: Executes workflow/CRUD commands; emits business/error events.
- Membership: Graph of identities/relationships (Neo4j).
- Analytics: Consumes Kafka events, persists to ClickHouse, serves analytics APIs.
- Traefik: Ingress routing for SPAs and BFF.
- Observability: OTEL traces (Jaeger), metrics (Prometheus), logs (Vector→Loki), dashboards (Grafana).

### Core hostnames (examples)

- Ingress/edge: `traefik.ocg.labs.empowernow.ai`
- BFF/API: `api.ocg.labs.empowernow.ai`
- SPAs: `authn.ocg.labs.empowernow.ai`, `authz.ocg.labs.empowernow.ai`, `automate.ocg.labs.empowernow.ai`, `frontend.ocg.labs.empowernow.ai`, `runner.ocg.labs.empowernow.ai`
- Backends: `idp.ocg.labs.empowernow.ai`, `crud.ocg.labs.empowernow.ai`, `pdp.ocg.labs.empowernow.ai`, `analytics.ocg.labs.empowernow.ai`, `naming.ocg.labs.empowernow.ai`
- Observability: `prometheus.ocg.labs.empowernow.ai`, `grafana.ocg.labs.empowernow.ai`, `jaeger.ocg.labs.empowernow.ai`, `kafdrop.ocg.labs.empowernow.ai`, `clickhouse.ocg.labs.empowernow.ai`, `tabix.ocg.labs.empowernow.ai`

See service‑specific sections for deep dives, configuration, and runbooks.



### Hybrid connectivity to on‑premises systems

Some deployments require cloud/containerized services to communicate with on‑premises services (for example, enterprise LDAP/Active Directory or SAP LDAP) without opening inbound firewall ports. The recommended approach is to use Azure Relay with the Azure Relay Bridge (azbridge) to create secure outbound tunnels from the on‑premises network.

- See: [Azure Relay Bridge (azbridge)](/docs/services/identity-fabric/azure-relay-bridge) for architecture, Docker Compose examples, connection patterns (LDAP/LDAPS), security notes, and troubleshooting.
- Example consumers: `crud-service` (workflows needing LDAP), `idp` (directory lookups), or any service on the same Docker network as the bridge containers.
