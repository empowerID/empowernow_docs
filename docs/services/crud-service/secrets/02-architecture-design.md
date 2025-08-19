---
title: Architecture and design
description: Core components, data flow, and trust boundaries
---

Components

- VaultService (PEP): parses Canonical URIs, authorizes with PDP, fetches from providers, emits audits
- SecretPolicyService (PDP client): batch authorization with purposes (read, write, delete, rotate, read_metadata)
- Providers: OpenBao/HashiCorp KVv2, YAML (dev)
- CRUDService Secrets API: management endpoints for admins and automation

Flow

```mermaid
sequenceDiagram
  participant A as App/Service
  participant V as VaultService (PEP)
  participant P as SecretPolicyService (PDP)
  participant S as Provider (KVv2)
  A->>V: get_credentials(canonical_uri)
  V->>P: authorize(subject, resource, purpose)
  P-->>V: decision + obligations (ttl, max_uses)
  V->>S: fetch secret (versioned)
  S-->>V: value (map or scalar)
  V-->>A: redacted slot / materialized value
  V-->>A: audits + metrics
```

Trust boundaries

```mermaid
flowchart LR
  subgraph "App Boundary"
    A["Caller"]
    V["VaultService"]
  end
  A -- "DPoP/mTLS (preferred)" --> V
  V -- "least-privilege scopes" --> P["SecretPolicyService"]
  V -- "provider creds" --> S[(Providers)]
  S --> OB["OpenBao"]
  S --> HV["HashiCorp"]
  classDef ctrl fill:#eef,stroke:#99f,stroke-width:1px;
  class V,P ctrl;
```

Data in transit/at rest

- TLS between components; provider credentials stored securely
- Audits emitted to Kafka; logs redacted; resource_ref HMAC masks URIs

Failure modes

- Policy deny → fail closed with 403
- Provider down → 502 with retries/backoff; no cache of plaintext
- Binding failure (DPoP/mTLS) → 401/403

Scale and HA

- VaultService stateless (horizontal scale); PDP caches decisions with TTL
- Backpressure: queue limits on provider calls; circuit breaking recommended

Configuration surface

- Timeouts, retries, max concurrency documented in Admin how‑to; default sane limits


