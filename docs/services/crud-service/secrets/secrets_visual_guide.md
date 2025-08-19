---
title: Secrets visual guide
description: High‑level architecture, decision tree, URI anatomy, and migration flow for the Secrets Platform.
---

## Architecture flow — at a glance

```mermaid
flowchart LR
  A["Client or connector"] --> B["CRUDService API or worker"]
  B --> C["VaultService (PEP)"]
  C --> D["SecretPolicyService (PDP)"]
  D -- "Grants and obligations" --> C
  C --> E{"Providers"}
  E --> E1["OpenBao KVv2"]
  E --> E2["DB credentials (encrypted)"]
  E --> E3["File (Docker / K8s CSI)"]
  E --> E4["YAML (dev only)"]
  C --> F["Audits → Kafka"]
  C -- "Secret (slot)" --> B
  F -. "Non‑leaky resource_ref" .- G["Analytics / monitoring"]
```

## Decision tree — which store or pointer to use

```mermaid
flowchart TD
  Start["Need a secret"] --> Q1{"Needed before app starts?"}
  Q1 -- "Yes" --> File["Use file (Docker secret / K8s CSI)\nPointer: file:primary:<name>"]
  Q1 -- "No" --> Q2{"App‑managed credential?"}
  Q2 -- "Yes" --> DB["Use DB credential\nPointer: db:credentials:<uuid>"]
  Q2 -- "No" --> Q3{"Platform / service secret?"}
  Q3 -- "Yes" --> KV["Use OpenBao KVv2\nPointer: openbao+kv2://secret/...#KEY"]
  Q3 -- "Local‑only" --> YAML["Use YAML (dev only)\nPointer: yaml://secret/...#KEY"]
  File --> End["Reference with pointer in env / config"]
  DB --> End
  KV --> End
  YAML --> End
```

## Canonical Secret URI anatomy

```mermaid
flowchart LR
  U["URI"] --> A["provider"]
  U --> B["engine (optional)"]
  U --> C["mount"]
  U --> D["path"]
  U --> E["fragment key"]
  U --> F["params (optional)"]

  S1["Example: openbao+kv2://secret/azure/msgraph#CLIENT_SECRET?version=3"]
  S1 --> A
  S1 --> B
  S1 --> C
  S1 --> D
  S1 --> E
  S1 --> F

  subgraph "Legend"
    A1["provider = openbao | hashicorp | file | db | yaml"]
    B1["engine = kv2 (for Vault KVv2)"]
    C1["mount = first path segment (e.g., secret)"]
    D1["path = remaining segments (e.g., azure/msgraph)"]
    E1["fragment = key within object (e.g., CLIENT_SECRET)"]
    F1["params = query options (e.g., version=3)"]
  end
```

## Migration flow — from .env to pointers

```mermaid
flowchart LR
  A["Inventory .env secrets"] --> B{"Classify"}
  B -- "Bootstrap" --> C["Create Docker secret / K8s CSI file\nPointer: file:primary:<name>"]
  B -- "Platform" --> D["Create in OpenBao KVv2\nPointer: openbao+kv2://...#KEY"]
  B -- "App‑managed" --> E["Create via /api/crud/credentials\nPointer: db:credentials:<uuid>"]
  C --> F["Replace env literals with pointers"]
  D --> F
  E --> F
  F --> G["Verify with /api/secrets/value and app flows"]
  G --> H["Enable prod guards: REQUIRE_AUTH, ENFORCE_SCOPES, PDP"]
```

## Quick cheat sheet

- Use file (Docker / K8s CSI) for bootstrap secrets: `file:primary:<name>`; set `FILE_MOUNT_PATH` for CSI.
- Use OpenBao KVv2 for platform / service secrets: `openbao+kv2://secret/<path>#KEY[?version=N]`.
- Use DB credential for app‑managed OAuth / API: `db:credentials:<uuid>`.
- Dev‑only YAML for quick iteration: `yaml://secret/<path>#KEY`.

## Verification

- Seed KVv2:
```bash
curl -s -X POST "http://localhost:8000/api/secrets" \
  -H "Content-Type: application/json" \
  -d '{"uri":"openbao+kv2://secret/crud#CREDENTIAL_ENCRYPTION_KEY","value":"<base64-or-random>"}'
```
- Read to confirm:
```bash
curl -s "http://localhost:8000/api/secrets/value?uri=openbao+kv2://secret/crud#CREDENTIAL_ENCRYPTION_KEY"
```
- Live events:
```bash
curl -N "http://localhost:8000/api/secrets/events"
```

## Production switches

- Set `SECRETS_API_REQUIRE_AUTH=true`, `SECRETS_ENFORCE_SCOPES=true`, `ENABLE_AUTHORIZATION=true`.
- Keep `TENANT_ALLOWED_MOUNTS=secret` and set strong `SECRET_TENANT_SALT`.

---

See also: [Providers](./providers), [Canonical URIs and policy](./canonical-uris-and-policy), [Security model](./security-model), [Migration guide](./SECRETS_MIGRATION_GUIDE).

If you want, I can embed these diagrams and a condensed narrative into `CRUDService/docs/guides/SECRETS_MIGRATION_GUIDE.md` as a “Visual Learner’s” section.