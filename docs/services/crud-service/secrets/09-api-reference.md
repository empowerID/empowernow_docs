---
title: API reference
description: Secrets API endpoints, scopes, purposes, and examples
---

See also: `../reference/secrets-api.md` for a consolidated reference.

Key endpoints

- POST `/api/secrets`, GET `/api/secrets`, GET `/api/secrets/value`
- DELETE `/api/secrets`, POST `/api/secrets/rotate`
- GET `/api/secrets/metadata`, `/keys`, `/metadata/detail`, `/versions`
- POST `/api/secrets/undelete`, `/destroy-versions`, `/bulk`, `/copy`, `/move`
- GET `/api/secrets/search`, `/events`, `/audit`

Scopes (optional) and PDP purposes are listed per endpoint in the reference page.

Compliance signals (CISO)

- Audit fields: `subject`, `purpose`, `effect`, `resource_ref`, `decision_id`

Operational limits (Admin)

- Timeouts/retries per provider operation; 429/503 semantics on overload
- Pagination defaults: listing/search limit 100 (configurable)
- Concurrency caps documented in Admin how‑to

QA edge cases to exercise

- Undelete/destroy with empty versions, version pin reads, prefix search traversal


