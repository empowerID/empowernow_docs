---
title: Secrets enforcement (PEP/PDP) — Executive overview
description: Central policy enforcement for secrets with grants, canonical URIs, and non‑leaky audits. Fail‑closed by default with minimal developer burden.
---

### Review outcome
- Most feedback is excellent and fits our “use, not read” and thin‑waist goals. We’re incorporating it with clarifications to keep the model simple now and extensible later.

### Executive overview (for CISO & Product)
- **Purpose**: Central policy enforcement for secrets (“use, not read”), with provable controls, clean operations, and minimal developer burden.
- **What’s enforced**:
  - Canonical Secret URIs with tenant guards and strict validation
  - PDP‑backed authorization issuing short‑lived, sender‑bound grants (DPoP/mTLS + anti‑replay)
  - Provider parity (KVv2 versioning, delete/destroy types; dynamic DB leases)
  - Egress “secret slots” that prevent leaks across logs/metrics/responses
  - Audits with non‑leaky identifiers (`resource_ref`), decision correlation, and sampling
- **Outcomes**:
  - Fail‑closed defaults with break‑glass out of band
  - Low latency on grant hits; clear runbooks; phased rollout with safe switches

### Architecture (high level)
```mermaid
graph LR
  Client["Client (/execute, Workflows)"] --> CRUD["CRUDService"]
  CRUD --> PEP["VaultService (PEP)"]
  PEP --> PDP["SecretPolicyService (PDP)"]
  PEP --> CACHE["Grants / Anti‑replay / Negative cache"]
  PEP --> PROV{"Providers"}
  PROV --> OB["OpenBao (KVv2)"]
  PROV --> HV["HashiCorp Vault (KVv2)"]
  PROV --> DBC["DB Credentials (enc/lease)"]
  PROV --> FILE["File/CSI (dev)"]
  PEP --> AUD["Audit (Kafka)"]
  CRUD --> CONN["Connectors (REST/LDAP/ODBC/SSH)"]
  CONN -. uses .-> SLOTS["Egress Secret Slots (redacted)"]
  PDP -- Grants/Obligations --> PEP
```

### Request flow (simplified)
```mermaid
sequenceDiagram
  participant C as Client
  participant X as /execute
  participant V as VaultService (PEP)
  participant S as SecretPolicyService (PDP)
  participant P as Provider (KVv2/DB)
  participant A as Audit

  C->>X: Invoke action (system/workflow)
  X->>V: Resolve secret pointers (+ExecutionContext)
  V->>S: Batch authorize (aud, cnf, jti)
  S-->>V: Grants (ttl, max_uses, obligations)
  V->>P: Fetch secret
  P-->>V: Secret with metadata and lease
  V->>A: Audit (resource_ref, decision, kv_version, lease)
  V-->>X: Return secret slot (redacted)
  X-->>C: Success (no plaintext values)
```

### What we’re adopting (tightened and actionable)
- **Canonical URIs** with strict normalization, tenant guards, and explicit error codes.
- **v1 ARN** mapping plus a short HMAC‑based `resource_ref` for audit/cache.
- **PEP + Grants** with sender‑binding (DPoP/mTLS), `jti` anti‑replay, atomic use‑count semantics, negative caching, and fail‑closed on PDP outage (except break‑glass).
- **Batch PDP** semantics for `/execute` and workflows; revalidation rules.
- **Provider edge cases** (KVv2 pinned version, delete/destroy types; DB engine leases/renew/revoke).
- **Egress guard** via secret “slots” that block leakage and enforce redaction.
- **Audit enrichment** (non‑leaky), safer defaults, and security‑focused tests.

### Where to go next
- Canonical URI grammar and error codes: ./../how-to/secrets-canonical-uris.md
- Audits and metrics schema: ./../how-to/audits-and-metrics.md
- YAML Vault Provider for local dev: ./../how-to/yaml-vault-provider.md


