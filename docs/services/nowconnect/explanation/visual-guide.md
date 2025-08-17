## NowConnect — Visual Guide

This page gives a visual overview of how NowConnect works, from tunnel setup to data flow and connection lifecycle.

### Components and Data Flow

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

### Tunnel Establishment (Auth + HELLO)

```mermaid
sequenceDiagram
  participant AG as Agent
  participant CH as Cloud Hub
  participant IDP as IdP (JWKS)

  AG->>CH: WS upgrade (Authorization: Bearer JWT)
  CH-->>IDP: Fetch JWKS (cached)
  IDP-->>CH: JWKS keys
  CH->>CH: Validate JWT (aud, signature)
  CH-->>AG: 101 Switching Protocols
  AG->>CH: HELLO {agent_id, connectors, ver}
  CH->>CH: Reconcile agent_id with JWT claim
  CH-->>AG: HELLO_ACK
```

### Handling a New TCP Connection (Multiplexed stream)

```mermaid
sequenceDiagram
  participant CLI as Client
  participant CH as Cloud Hub
  participant AG as Agent
  participant TGT as Target (on-prem)

  CLI->>CH: TCP connect to listener (e.g., 389)
  CH->>AG: OPEN {cid, connector}
  AG->>TGT: TCP connect host:port (from connector map)
  alt connect ok
    CH->>AG: DATA {cid, seq}
    AG->>CH: DATA {cid, seq}
    CH->>CLI: bytes
    opt Half-close
      CLI-->>CH: EOF
      CH->>AG: FIN {cid, dir=c2a}
      AG-->>TGT: write EOF
    end
    opt Target EOF
      TGT-->>AG: EOF
      AG->>CH: FIN {cid, dir=a2c}
    end
    CH->>CH: Close when both FINs observed
  else connect failed
    AG->>CH: RST {cid, err=connect_failed}
    CH-->>CLI: close socket
  end
```

### Connection Lifecycle (per `cid`)

```mermaid
stateDiagram-v2
  [*] --> Open
  Open --> Data: OPEN sent/acknowledged
  Data --> HalfC2A: FIN(dir=c2a)
  Data --> HalfA2C: FIN(dir=a2c)
  HalfC2A --> Closed: FIN(dir=a2c)
  HalfA2C --> Closed: FIN(dir=c2a)
  Data --> Closed: RST or error
  Data --> Closed: Idle sweeper triggers FIN(dir=c2a) → peer FIN
```

### Mapping Many Backends (example: LDAPS)

```mermaid
flowchart TB
  subgraph Cloud Hub
    L1[listener 6361 → connector ldaps_dc1]
    L2[listener 6362 → connector ldaps_dc2]
    L3[listener 6363 → connector ldaps_dc3]
  end

  subgraph Agent targets
    C1[ldaps_dc1 → dc1.corp.local:636]
    C2[ldaps_dc2 → dc2.corp.local:636]
    C3[ldaps_dc3 → dc3.corp.local:636]
  end

  L1 --> C1
  L2 --> C2
  L3 --> C3
```

### Health and Readiness

```mermaid
flowchart LR
  AG[Agent] -- TCP health --> H[(NC_HEALTH_HOST:PORT)]
  H -->|"OK (pre‑ACK) / READY (post‑ACK)"| AG
  CH[Cloud Hub] --> /healthz
  CH --> /readyz
  CH --> /metrics
```

Tips:
- Keep `max_ws_payload` modest (e.g., 8KB) and queues bounded for stable memory.
- Enable connector scopes and PDP only when needed; both are feature‑flagged.
- Use `NC_CA_BUNDLE` and `NC_TRUST_ENV=true` for corporate proxy/TLS interception environments.

