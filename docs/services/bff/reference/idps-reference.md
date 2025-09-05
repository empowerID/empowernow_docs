---
title: idps.yaml Reference
---

Fields per IdP entry

- name: logical label
- provider: canonical alias used for identity/ARNs (optional; falls back to name)
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

- empowernow → audience https://idp.ocg.labs.empowernow.ai/api/admin (provider: empowernow)
- empowernow-crud → audience https://crud-service:8000 (provider: empowernow)

ARN/provider notes

- When constructing unique identities (ARNs), services prefer the IdP entry `provider` field to choose the provider segment. If `provider` is omitted, the `name` is used (backward compatible).
- This stabilizes identities across multiple IdP entries that share the same issuer but differ by audience. For example, both `empowernow` and `empowernow-crud` yield `auth:account:empowernow:{sub}`.


