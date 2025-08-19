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
graph LR
  subgraph App Boundary
    A[Caller] --> V[VaultService]
  end
  V --> P[SecretPolicyService]
  V --> S[(Providers)]
  S --> OB[OpenBao]
  S --> HV[HashiCorp]
```


