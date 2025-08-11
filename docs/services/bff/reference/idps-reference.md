---
title: idps.yaml Reference
---

Fields per IdP entry

- name: logical label
- issuer: OIDC issuer URL
- audience: expected `aud` for this context/service
- jwks_url: JWKS endpoint for signature validation
- introspection_url, token_url: optional OAuth endpoints
- client_id, client_secret: client credentials
- enable_token_exchange: boolean
- api_key: optional
- claims_mapping:
  - roles: sources for role claims (e.g., roles, groups)
  - permissions: sources for permissions; supports `format: space_delimited`

Examples

- empowernow → audience https://idp.ocg.labs.empowernow.ai/api/admin
- empowernow-crud → audience https://crud-service:8000


