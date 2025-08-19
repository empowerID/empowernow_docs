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

Threat model (CISO)

- Goals: prevent secret exfiltration, prevent misuse, enable forensics
- Mitigations: binding, short TTLs, audits, default‑deny policies, redaction

Binding modes

- Prefer mTLS/DPoP; fallback to audience checks; reject on mismatch

Anti‑replay

- JTI uniqueness within TTL window; cache enforced in PEP

Log redaction and auditability

- Sensitive fields masked; audit records include subject, purpose, decision, resource_ref

Admin configuration

- SECRETS_ENFORCE_SCOPES=true, SECRETS_API_REQUIRE_AUTH=true, SECRETS_AUDIENCE


