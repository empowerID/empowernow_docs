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


