---
id: pep-pdp-request
title: PEP → PDP request shape (IdP as PEP)
description: What the IdP sends to the PDP for policy evaluation, including mapping, scopes, and context attributes.
---

This page documents how the IdP acts as a Policy Enforcement Point (PEP) and what it sends to the Policy Decision Point (PDP) for authorization decisions.

## Mapping overview

- **Resource/action mapping**: The middleware maps HTTP endpoints to `resource` and `action` via `endpoint_map` in `ServiceConfigs/IdP/config/pdp.yaml`.
  - Example: `POST /api/admin/dcr/initial-access-tokens` → `resource.type = admin_api`, `action = create`, `id = "*"`.

- **Subject scopes**: The PEP sends scopes in `subject.attributes.scopes` as an array of strings. It does not populate `context.token.scopes`. For reference only, it sends a single `context.token.scope` string.

- **Request context**: The PEP includes `context.attributes.request_path` and `context.attributes.request_method` with the incoming HTTP path and method.

## Policy checks to perform

For the example endpoint above, a policy should validate all of:

- `contains(subject.attributes.scopes, 'admin.api')`
- `contains(subject.attributes.scopes, 'dcr.register')`
- `context.attributes.request_path == '/api/admin/dcr/initial-access-tokens'`
- `context.attributes.request_method == 'POST'`

## Example PDP input

The following is a representative PDP evaluation request body the IdP sends:

```json
{
  "subject": {
    "id": "<subject-id>",
    "attributes": {
      "scopes": ["admin.api", "dcr.register"],
      "client_id": "<client-id>"
    }
  },
  "resource": {
    "type": "admin_api",
    "id": "*",
    "attributes": {}
  },
  "action": {
    "id": "create"
  },
  "context": {
    "token": {
      "scope": "admin.api dcr.register"
    },
    "attributes": {
      "request_path": "/api/admin/dcr/initial-access-tokens",
      "request_method": "POST"
    }
  }
}
```

## Notes

- Scopes must be read from `subject.attributes.scopes` in policies.
- The `context.token.scope` string is present for diagnostics but should not be used for matching.
- Endpoint-to-resource/action mapping is controlled by `pdp.yaml` under the IdP service configuration.

### Obligations and delegation (IdP vs PDP)

- The IdP may call `evaluate` or `evaluate_with_obligations` depending on whether IdP-side PEP side-effects are needed (e.g., audit/workflows/pep_meta).
- Delegation provisioning is performed inside the PDP by the ProvisionInterceptor when policies emit a delegation obligation. It does not depend on IdP obligations configuration.
- Clients should read delegation results from the PDP response at `context.attributes.delegation` if provisioning occurred.


