---
title: Security model
description: Grants, sender binding, anti‑replay, and least privilege
---

Grants

- PDP issues obligations (TTL, max_uses) that VaultService enforces
- Short‑lived and purpose‑bound grants reduce risk

Sender binding

- Prefer DPoP/mTLS when available; otherwise audience checks
- JTI anti‑replay where tokens are involved

Least privilege

- Scopes optional on Secrets API (`secrets.read`, `secrets.write`, etc.)
- Canonical URIs + tenant guards prevent cross‑tenant access


