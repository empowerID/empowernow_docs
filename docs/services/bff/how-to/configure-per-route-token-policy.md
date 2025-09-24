---
title: Configure Per‑Route Token Policy
---

## Goal
Attach the right token to each upstream: CC service tokens for admin/backends, OBO where user‑bound tokens are required.

## Steps
1) Enable feature flags (BFF)
```
BFF_TOKEN_POLICY_ENABLED=true
BFF_OBO_ENABLED=false  # enable later to use OBO
```

2) Add token_policy to routes.yaml
```yaml
- id: idp-admin
  path: /api/idp/admin/*
  target_service: idp_service
  upstream_path: /api/admin/{path}
  methods: [GET, POST]
  auth: session
  token_policy:
    mode: service_token
    service: idp_admin
    audience: https://idp.../api/admin
    scopes: [admin.api]
    cache_ttl: 300
```

3) Configure service registry defaults
- Map each logical service to canonical audience/scopes in BFF settings.

4) Align IdP
- Ensure clients (`bff-server`) can mint CC; prefer `private_key_jwt`.
- For RFC 8707, enable resource indicators and send `resource=<audience>`.

## Verify
- Logs show `token_found` and upstream 2xx; cache hits increase over time.
- Issuance failures return 502 (`upstream_auth_failed`) with structured reason.

## See also
- Explanation: `services/bff/explanation/per-route-token-policy.md`
- Routes reference: `services/bff/reference/routes-reference.md`
- IdP Resource Indicators: `services/idp/explanation/rfc8707-resource-indicators.md`

