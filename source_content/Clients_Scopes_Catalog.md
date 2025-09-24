# Clients & Scopes Catalog

## service-client (BFF, internal services)
- Grant types: password, client_credentials, refresh_token, token-exchange
- Allowed endpoints include:
  - `/api/oidc/token`, `/api/oidc/introspect`, `/api/oidc/userinfo`
  - `/api/v1/users`, `/api/admin/*`
  - `/api/idp/oauth/pat/introspect`
- Scopes: `openid`, `profile`, `user:read`, `user:write`, `admin`, `token.introspection`, `delegate`, `bff.llm.invoke`

### Notes on PAT endpoints and PDP
- BFF routes map PAT UI actions to PDP resources/actions:
  - list → `resource: idp:pat`, `action: list`
  - issue → `resource: idp:pat`, `action: issue`
  - revoke → `resource: idp:pat`, `action: revoke`
- Introspection remains service-to-service via bearer and is not exposed to SPAs.

## pdp-introspect-client (PDP)
- For token introspection with known secret
- Scopes: `token.introspection`

## SPA clients (idp_ui, etc.)
- Public clients for UI with `admin.api` mapped to admin audience

## Notes
- Keep minimal scopes per client; restrict allowed_endpoints per least privilege
- Map scopes to audiences in `settings.yaml` to route tokens appropriately
