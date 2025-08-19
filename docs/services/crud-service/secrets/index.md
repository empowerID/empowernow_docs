---
title: Secrets Platform
sidebar_label: Overview
---

This section describes the EmpowerNow Secrets Platform end‑to‑end, from executive overview down to API details and ops runbooks.

Suggested reading order:

1) Executive overview
2) Architecture and design
3) Canonical URIs and policy model
4) Providers (OpenBao/HashiCorp/YAML dev)
5) Security model (grants, sender binding, anti‑replay)
6) Operational visibility (audits, metrics, traces)
7) Admin how‑to (setup, rotate, backup/restore)
8) Developer guide (URIs, SDK, API)
9) API reference
10) Troubleshooting and runbooks

---

Business summary (for CISO)

The Secrets Platform centralizes secret access, enforces policy before use, and emits auditable events. It reduces risk by removing secrets from app code, binding usage to callers, and enabling fast, safe rotation.

- Risk reduction
  - Short‑lived, purpose‑bound grants reduce blast radius
  - Sender binding (DPoP/mTLS) thwarts token replay
  - Canonical URIs + tenant guard prevent cross‑tenant leakage
  - Non‑leaky audits (HMAC `resource_ref`) support investigations
  - Versioned providers enable undelete and controlled destroy

- System boundary and data flows
  - Callers → VaultService (PEP) → SecretPolicyService (PDP) → Providers (OpenBao/HashiCorp/YAML)
  - Kafka/Loki/OTel carry audits, logs, metrics, and traces

- Control ownership
  - Policy definitions and approvals: Security / CISO office
  - Operations and provider lifecycle: Platform team
  - Application integration and pointers: Product teams

- Compliance mapping (indicative)
  - SOC2 CC6, CC7; ISO 27001 A.8, A.9, A.12; NIST 800‑53 AC‑3, AU‑2, AU‑12, SC‑23

---

Supported providers and versions (for Admin)

| Provider | Engine | Versioning | Writes | Deletes | Undelete | Destroy versions |
| --- | --- | --- | --- | --- | --- | --- |
| OpenBao | KVv2 | Yes | Yes | Soft | Yes | Yes |
| HashiCorp Vault | KVv2 | Yes | Yes | Soft | Yes | Yes |
| YAML (dev only) | N/A | No | Yes (dev/test) | Yes (dev/test) | No | No |

Prerequisites and flags

- ENABLE_AUTHORIZATION=true (enable PDP checks)
- SECRETS_API_REQUIRE_AUTH=true (require auth to `/api/secrets/*`)
- SECRETS_ENFORCE_SCOPES=true (enforce OAuth scopes)
- TENANT_ID, TENANT_ALLOWED_MOUNTS (URI guard)
- Provider config: VAULT_URL, VAULT_TOKEN (or AppRole), YAML_VAULT_PATH

Key links

- Setup: ./07-admin-howto.md
- API reference: ../reference/secrets-api.md
- Authorization model (PDP): ./11-authorization-model-authzen.md
- Auditing & logging: ./12-auditing-logging.md
- Automation & workflows: ./13-automation-execute-workflows-agents.md

---

Test scope and environments (for QA)

| Area | Dev | Test/Stage | Prod |
| --- | --- | --- | --- |
| YAML provider | Enabled | Optional | Disabled |
| KVv2 providers | Optional | Enabled | Enabled |
| PDP enforcement | Optional | Enabled | Enabled |
| Scope enforcement | Optional | Optional | Enabled |
| SSE events/audit buffer | Enabled | Optional | Disabled |



