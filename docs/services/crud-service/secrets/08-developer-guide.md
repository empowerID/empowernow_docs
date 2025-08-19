---
title: Developer guide
description: Using Canonical URIs, SDK patterns, and the Secrets API
---

URIs

- Prefer Canonical URIs in env pointers (e.g., `CREDENTIAL_ENCRYPTION_KEY_POINTER`)
- YAML for dev: `yaml://secret/env#KEY`, KVv2: `openbao+kv2://secret/app#token`

SDK pattern

```python
from src.services.vault_service import VaultService
svc = VaultService(ttl=60)
creds = await svc.get_credentials("openbao+kv2://secret/app/api#token")
```

REST API

- Management via `/api/secrets` (create/update/delete/rotate)
- Provider‑backed reads via `/api/secrets/value?uri=...`

Developer responsibilities (CISO)

- Do not embed plaintext secrets; use Canonical URI pointers only
- Limit YAML usage to local dev; never commit dev files

Testing patterns (QA)

- Unit: mock `VaultService` and provider strategies
- Integration: spin up dev provider, use Canonical URIs, validate versioned reads
- Contract: per‑endpoint tests with success/403/400/501 paths


