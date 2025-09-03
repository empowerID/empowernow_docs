---
id: dcr-compose-wiring
title: Wire the IAT into docker‑compose and run the BFF DCR bootstrap
description: "Where to paste the Initial Access Token (IAT) in compose, the restart sequence, verification, and how DCR_* settings affect behavior."
sidebar_label: "DCR: wire IAT in compose"
---

## Where to edit

File: `CRUDService/docker-compose-authzen4.yml` → service `bff:` → `environment:`

Replace `DCR_IAT` with the short‑lived token you minted in the IdP step.

```yaml
bff:
  # ...
  environment:
    DCR_ENABLED: "true"
    SKIP_DCR_BOOTSTRAP: "false"
    IDP_BASE_URL: http://idp-app:8002
    DCR_IAT: <PASTE_IAT_TOKEN_HERE>
    DCR_CLIENT_ID: bff-server
    DCR_CLIENT_PROFILE: code-flow-pkjwt
    DCR_REDIRECT_URIS: https://automate.ocg.labs.empowernow.ai/auth/callback,https://authn.ocg.labs.empowernow.ai/auth/callback,https://authz.ocg.labs.empowernow.ai/auth/callback
    DCR_SIGNING_KEY: /app/keys/bff-sig-001.pem
    BFF_KID: bff-sig-001
    DCR_ROTATION_SAFE: "true"
    DCR_REDIRECT_UPDATE_MODE: auto
  # ...
```

Notes

- Redirect URIs must be a comma‑ or space‑separated list your IdP accepts.
- `BFF_JWT_SIGNING_KEY`/`BFF_KID` must correspond to the key published at `/.well-known/jwks.json`.

## Restart sequence

1) Apply compose changes.
2) Restart IdP (if you changed DCR settings there), then restart BFF.
3) Watch BFF logs for successful registration (201) or PATCH (200).
4) After success, remove `DCR_IAT` from compose and restart BFF once more.

## Verify

- IdP: `GET /api/oidc/register/{client_id}` shows `bff-server` with your `jwks_uri` and `kid`.
- BFF: creds JSON present (if persisted), and JWKS served at `/.well-known/jwks.json` includes `bff-sig-001`.

## How DCR settings impact behavior

- `DCR_ENABLED` (true): turns on bootstrap logic; if false, no DCR calls are made.
- `SKIP_DCR_BOOTSTRAP` (false): run bootstrap on start; if true, skip DCR entirely.
- `DCR_IAT` (token): used only when no cached client exists; remove after success.
- `DCR_FORCE_REPLACE` (false): if true, delete/re‑register the client; use for hard resets.
- `DCR_CLIENT_ID` (bff-server): desired client identifier; leave unset to let IdP assign.
- `DCR_CLIENT_PROFILE` (code-flow-pkjwt): IdP template controlling defaults (grant types, auth method).
- `DCR_REDIRECT_URIS`: required for auth code flow; must exactly match SPA callback URLs.
- `DCR_SIGNING_KEY`, `BFF_KID`: private key and key id for `private_key_jwt`; IdP validates inline `jwks` during PATCH.
- `BFF_JWK_ROTATE_AFTER_DAYS`, `BFF_JWK_RETIRE_AFTER_DAYS`, `BFF_JWK_MAX_KEYS`: tune safe key rotation overlap.
- `DCR_ROTATION_SAFE`, `DCR_REDIRECT_UPDATE_MODE`: enable non-destructive redirect updates.

## Next steps

- If you haven’t minted an IAT yet, see: `services/idp/how-to/mint-iat-and-dcr`.
- Operational policy and deeper details: `services/bff/how-to/dcr-bootstrap`.


