---
title: Executive overview
description: What the Secrets Platform is and the value it delivers
---

The Secrets Platform centralizes how services access credentials, API keys, and configuration secrets. It enforces policy before use, standardizes URIs, and provides consistent auditing.

Why it matters:

- **Security**: tokens/keys are never spread across apps; short‑lived grants and sender binding reduce blast radius.
- **Consistency**: one way to reference secrets across providers (OpenBao, HashiCorp Vault) and environments.
- **Compliance**: non‑leaky audits, masking, and versioned recovery.

At a glance:

```mermaid
flowchart LR
  Client["App/Service"] --> PEP["VaultService (PEP)"]
  PEP --> PDP["SecretPolicyService (PDP)"]
  PEP --> Providers{{"Providers"}}
  Providers --> OB[("OpenBao KVv2")]
  Providers --> HV[("HashiCorp KVv2")]
  Providers --> YAML[("YAML dev store")]
  PEP --> Audits["Kafka audits + metrics"]
```


