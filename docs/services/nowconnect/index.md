---
id: index
title: NowConnect
description: Tunneling for hybrid connectivity between cloud services and on‑premises systems.
---

NowConnect enables outbound‑only, agent‑mediated connectivity from on‑premises networks to cloud services, used here to access systems like LDAP without opening inbound firewall ports.

See How‑to for operational validation and health guidance.

## NowConnect

NowConnect is a secure TCP tunneling service that lets cloud apps reach specific on‑prem systems without opening inbound firewall ports. A lightweight agent on‑prem makes a single outbound WebSocket to the Cloud Hub; the hub exposes TCP listeners (e.g., 389/636/22/1433) and relays bytes over that tunnel. TLS for end‑protocols (LDAPS/HTTPS/TCPS) remains end‑to‑end.

### At a glance
- Protocol‑agnostic TCP: LDAP/LDAPS/GC, Kerberos (TCP), SSH, Telnet, ODBC (SQL Server/Oracle/Postgres/MySQL), and internal REST
- Single outbound `wss://` tunnel from premise through corporate proxies (proxy/CA supported)
- Multiplexed streams with bounded queues, backpressure, FIN/RST, and idle sweeper
- Auth: JWT on WS upgrade (audience, JWKS), `HELLO.agent_id` reconciliation
- Optional AuthZ: PDP on `OPEN(connector)` and/or connector scopes in JWT (feature‑flagged)
- Ops: Prometheus metrics, JSON logs (no payload), `/healthz` `/readyz`, agent TCP health (OK→READY)

### Visual overview

```mermaid
flowchart LR
  CH[Cloud Hub]
  L[Connector listeners]
  MET[Prometheus metrics]
  PDP[PDP optional]
  IDP[IdP JWKS]
  AG[Premise Agent]
  TGT[On-prem targets]
  CLI[Client]

  CLI -->|TCP ports| L
  L --> CH
  AG -- wss tunnel --> CH
  CH -->|JWT verify| IDP
  CH -->|authorize?| PDP
  CH --> MET
  AG -->|TCP| TGT
```

### Session flow (happy path)

```mermaid
sequenceDiagram
  participant AG as Agent
  participant CH as Cloud Hub
  participant IDP as IdP (JWKS)
  participant CLI as Client
  participant TGT as Target

  AG->>CH: WS upgrade (Authorization: Bearer JWT)
  CH-->>IDP: Fetch JWKS (cached)
  IDP-->>CH: JWKS keys
  CH->>CH: Validate JWT (aud, signature)
  CH-->>AG: 101 Switching Protocols
  AG->>CH: HELLO {agent_id, connectors, ver}
  CH->>CH: Reconcile agent_id with JWT claim
  CH-->>AG: HELLO_ACK

  CLI->>CH: TCP connect to listener (e.g., 389)
  CH->>AG: OPEN {cid, connector}
  AG->>TGT: TCP connect host:port
  CH->>AG: DATA {cid, seq}
  AG->>CH: DATA {cid, seq}
  AG->>TGT: bytes
  TGT->>AG: bytes
  opt Half-close
    CLI-->>CH: EOF
    CH->>AG: FIN {cid, dir=c2a}
  end
  opt Target EOF
    TGT-->>AG: EOF
    AG->>CH: FIN {cid, dir=a2c}
  end
  CH->>CH: Close after both FINs
```

### Key docs
- How-to: Premise Agent setup: [how-to/premise-agent](how-to/premise-agent.md)
- How-to: Cloud Hub deployment: [how-to/cloud-hub-deploy](how-to/cloud-hub-deploy.md)
- Reference: Configuration (YAML/env): [reference/configuration](reference/configuration.md)
- Reference: Wire protocol: [reference/wire-protocol](reference/wire-protocol.md)
- Reference: Metrics & Observability: [reference/metrics](reference/metrics.md)
- Reference: Security model: [reference/security](reference/security.md)
- Reference: IdP support and auth: [reference/idp-and-auth](reference/idp-and-auth.md)
- Reference: Security overview: [reference/security-overview](reference/security-overview.md)
- Reference: Compliance mapping: [reference/compliance-mapping](reference/compliance-mapping.md)
- Reference: Logging & retention: [reference/logging-and-retention](reference/logging-and-retention.md)
- Reference: PKI guidance: [reference/pki-guidance](reference/pki-guidance.md)
- Reference: Ports & protocols: [reference/ports-and-protocols](reference/ports-and-protocols.md)
- Explanation: Architecture & design: [explanation/architecture](explanation/architecture.md)
- Explanation: Visual guide: [explanation/visual-guide](explanation/visual-guide.md)
- How-to: Connect common protocols: [how-to/connect-common-protocols](how-to/connect-common-protocols.md)
- How-to: LDAPS with multiple backends: [how-to/ldaps-multi-backend](how-to/ldaps-multi-backend.md)

### Role-based guide

- CISO: Start with [Security overview](reference/security-overview.md), [Compliance mapping](reference/compliance-mapping.md), and [Logging & retention](reference/logging-and-retention.md).
- IT Security Architect: See [PKI guidance](reference/pki-guidance.md), [Ports & protocols](reference/ports-and-protocols.md), and [IdP support](reference/idp-and-auth.md).
- DevOps/SRE: See [Cloud Hub deploy](how-to/cloud-hub-deploy.md), [Enable HA](how-to/enable-ha.md), and [Metrics](reference/metrics.md). For k8s and rollout, see Kubernetes and upgrade guides.
- QA/Testing: See [HA architecture](explanation/ha-v2-architecture.md) test section and upcoming testing guide.

