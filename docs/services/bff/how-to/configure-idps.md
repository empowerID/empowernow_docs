---
title: Configure IdPs (idps.yaml)
---

Location

- `ServiceConfigs/BFF/config/idps.yaml`

Fields

- `name`: logical name used in logs/telemetry
- `issuer`: OIDC issuer URL
- `audience`: expected `aud` for tokens in this context
- `jwks_url`: signature keys
- `introspection_url`: token introspection endpoint
- `token_url`: token endpoint
- `client_id`, `client_secret`: introspection/client auth
- `enable_token_exchange`: boolean
- `api_key`: optional
- `claims_mapping`:
  - `roles`: list of sources (e.g., `roles`, `groups`, or nested `resource_access` with `type: client_roles`)
  - `permissions`: list of sources (supports `format: space_delimited`)

Examples

- `empowernow` audience `https://idp.ocg.labs.empowernow.ai/api/admin`
- `empowernow-crud` audience `https://crud-service:8000`

Verification

- The bearer path calls `introspect_token_with_retry` and builds `EnhancedTokenClaims`, normalizing roles/permissions from `claims_mapping`.


