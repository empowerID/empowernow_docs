---
title: Federation – IdP ↔ Microsoft Entra ID (Azure AD)
sidebar_label: Azure Entra Federation
description: Configure and operate Azure Entra (Azure AD) federation with our IdP – configuration, flows, JWKS validation, token exchange (RFC 8693), PDP integration, policies, and security.
---

## Summary

Our IdP federates with Microsoft Entra ID (Azure AD) using OpenID Connect. The BFF initiates login at the IdP; the IdP page redirects the browser to Azure `/authorize`, then the IdP exchanges the code for tokens, validates with JWKS, maps claims, and mints a local identity. Tokens never reach the browser (BFF pattern).

Highlights:

- Protocol: OIDC authorization code + PKCE
- Validation: JWKS signature verification (no RFC 7662 introspection for Azure)
- Stable identity: Azure `oid` is used as the stable identifier
- Subject: IdP issues local tokens whose `sub` is an ARN (provider‑namespaced, hashed tenant)
- PDP: SPA/BFF call OpenID AuthZEN endpoints for decisions after authentication

## Validating Entra tokens (JWKS‑first)

- Verify JWTs against Azure JWKS (e.g. `https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys`)
- Validate issuer (`iss`), expiry (`exp`), and audience via `aud` or `azp` (Azure modes)
- Skip introspection for Azure‑like issuers (not provided for user tokens)

Implementation notes (code pointers):

- `IdP/templates/login.html` – builds Azure authorize URL + state
- `IdP/src/api/auth.py` – derives `azure_authorize_url` and callback
- `IdP/src/api/external_auth.py` – token exchange body and endpoint
- `IdP/src/services/federation_service.py` – JWKS‑first, `aud/azp` handling, ARN rewrite

## Architecture

```mermaid
flowchart LR
  SPA[SPA] --> BFF[BFF]
  BFF --> IdP[IdP]
  IdP -->|/authorize| Entra[Azure Entra ID]
  Entra -->|code| IdP
  IdP -->|token exchange| Entra
  IdP -->|local tokens| BFF
  BFF -->|session cookie| SPA
  SPA -->|/access/v1/*| BFF --> PDP[PDP (AuthZEN)]
```

## Federation configuration (example)

`federation.yaml`

```yaml
federation:
  enabled: true
  default_token_lifetime: 3600
  account_linking_enabled: true
  auto_provision_users: false

  require_secure_issuer: true
  jwks_cache_ttl: 3600
  log_federation_events: true
  audit_token_exchanges: true

  trusted_idps:
    - name: "entra-id"
      issuer: "https://login.microsoftonline.com/{tenantID}/v2.0"
      audience: ["api://<client-id>", "<client-id>"]
      jwks_url: "https://login.microsoftonline.com/{tenantID}/discovery/v2.0/keys"
      client_id: "${ENTRA_CLIENT_ID}"
      client_secret: "${ENTRA_CLIENT_SECRET}"
      enable_token_exchange: true
      tenant_id: "{tenantID}"
      stable_id_claim: "oid"
      max_token_age: 86400
      require_verified_email: false
      claims_mapping:
        roles:
          - { source: roles, format: array }
          - { source: groups, format: array }
        permissions:
          - { source: scp, format: space_delimited }
          - { source: permissions, format: array }
```

Key elements:

- `issuer`, `jwks_url`: per‑tenant discovery
- `audience`: accept `aud` or Azure `azp`
- `stable_id_claim`: use `oid` for durable identity mapping
- `enable_token_exchange`: allow RFC 8693 flows

## Authentication flow

1) SPA loads, no session → calls BFF `/auth/login`
2) BFF starts OIDC at IdP (PKCE + state)
3) IdP login page offers Azure; browser goes to Azure `/authorize`
4) Azure authenticates user → redirects code to IdP callback `/api/auth/external/azure/callback`
5) IdP exchanges code for tokens at Azure `/oauth2/v2.0/token`
6) IdP validates via JWKS, maps claims, mints local tokens (with ARN `sub`)
7) BFF creates session cookie and redirects SPA

Azure token exchange request (IdP → Azure):

```http
POST https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&client_id=<CLIENT_ID>&client_secret=<SECRET>&code=<AUTH_CODE>&redirect_uri=<IDP_BASE_URL>/api/auth/external/azure/callback&scope=openid%20profile%20email
```

## Token exchange (RFC 8693)

IdP supports `grant_type=urn:ietf:params:oauth:grant-type:token-exchange` to convert external Azure tokens to local IdP tokens.

Example response:

```json
{
  "access_token": "...",
  "issued_token_type": "urn:ietf:params:oauth:token-type:jwt",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email api.write",
  "refresh_token": "..."
}
```

Final local token (example):

```json
{
  "iss": "https://idp.example.com",
  "sub": "auth:v1:identity:entra-id-13ac97f8:ffe9b9f0-ec04-4b9c-bd48-30fdefd72a5e",
  "aud": ["bff-client"],
  "scope": "openid profile email api.write",
  "email": "john.doe@company.com",
  "idp": "entra-id",
  "idp_sub": "ffe9b9f0-ec04-4b9c-bd48-30fdefd72a5e",
  "roles": ["User", "Admin"],
  "permissions": ["User.Read", "User.Write"]
}
```

## PDP authorization

After authentication, the SPA calls the BFF’s AuthZEN endpoints for authorization. A typical decision request:

```json
{
  "subject": { "type": "user", "id": "auth:v1:identity:entra-id-13ac97f8:ffe9b9f0-ec04-4b9c-bd48-30fdefd72a5e" },
  "action": { "name": "document.view" },
  "resource": { "type": "document", "id": "doc-123" },
  "context": {}
}
```

Implementation note: In the Experience SPA we standardize the subject sent to the PDP as a canonical account ARN (`subject.type = "account"`, `subject.id = "auth:account:{provider}:{user_id}"`). If your policies use `auth:v1:identity:*` identifiers from federated tokens, ensure your PDP normalization or policy subjects accommodate both shapes.

See also: Experience → Authorization (AuthZEN) `../../experience/authorization-authzen`

## Policies (example)

`TestPolicy.yaml`

```yaml
id: TestPolicy
name: Test Policy for Full Access
schema_version: "2.0"
type: policy
policy_type: AuthZ
enabled: true
subjects:
  - { type: user, id: auth:v1:identity:entra-id-13ac97f8:ffe9b9f0-ec04-4b9c-bd48-30fdefd72a5e }
  - { type: user, id: auth:account:oidc:john.doe@company.com }
rules:
  - description: Allow user to validate designer draft
    resource: designer.draft_command
    action: validate
    effect: permit
```

## Security considerations

- Token validation: JWKS signature, issuer/audience checks, expiry enforcement
- Session security: server‑side session in Redis; HttpOnly/Secure/SameSite cookies; session binding (IP/UA hash)
- Federation security: explicitly trusted issuers in config; claims transformation; audit token exchanges
- Authorization security: least privilege policies; subject isolation via provider‑namespaced ARNs

## Health checklist

- IdP JWKS cache warms successfully; federation logs show trusted issuer
- PDP decisions return both allow and deny cases via BFF `/access/v1/*`
- Experience SPA loads with policy‑gated nav/routes/widgets




