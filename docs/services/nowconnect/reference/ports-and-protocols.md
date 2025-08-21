## Ports and Protocols

A concise matrix of ports, directions, and protocols for typical deployments.

### Matrix

| Source | Destination | Port/Proto | Purpose | Notes |
|---|---|---|---|---|
| Clients | Cloud Hub (LB/Ingress) | TCP 389/636/... | Connector listeners | TLS if end-protocol supports (e.g., LDAPS) |
| Premise Agent | Cloud Hub (LB/Ingress) | WebSocket over TLS (443) | `/tunnel` upgrade | Auth via JWT; optional ingress mTLS not required for agent |
| Cloud Hub A | Cloud Hub B (via Ingress) | WebSocket over TLS (443) | `/mesh` | Client mTLS enforced at ingress; SANs on hub certs |
| Cloud Hub | IdP | HTTPS 443 | JWKS fetch | Outbound only; cache keys |
| Cloud Hub | Redis | TCP 6379 (or TLS) | Distributed registry | Use TLS/auth per platform |
| Premise Agent | Local targets | TCP 389/636/22/... | Connector backends | No payload logging; end-to-end TLS preserved |

### Proxy patterns

- Agent can honor corporate proxies with `NC_TRUST_ENV=true`.
- Cloud Hub outbound to IdP/Redis may use platform egress proxies as required.

### Visual overview

```mermaid
flowchart LR
  C[Clients] -->|389/636| IG[Ingress]
  IG --> CH1[Cloud Hub A]
  IG --> CH2[Cloud Hub B]
  CH1 <-->|443 /mesh (mTLS)| CH2
  CH1 -->|443 HTTPS| IDP[IdP JWKS]
  CH1 -->|6379| R[(Redis)]
  AG[Premise Agent] -->|443 WSS /tunnel| IG
  AG -->|TCP| TGT[On‑prem Targets]
```


