---
id: bff-startup-dcr-iat
title: Fix BFF startup errors with a DCR Initial Access Token (IAT)
sidebar_label: "BFF startup: DCR IAT"
---

If the BFF fails during startup and shuts down with Dynamic Client Registration (DCR) errors, issue a fresh DCR Initial Access Token (IAT), place it in the compose env, and restart. A ready‑to‑use Postman request is checked in under the CRUD Service repo.

## When to use this

- Logs show bootstrap/registration failures (invalid/expired IAT, missing cred cache)
- You see hints like: “Get new RAT/IAT from /api/admin/dcr/initial-access-tokens and update DCR_IAT”

## Steps

1) Generate a DCR IAT (Postman collection available)

- Open Postman collection: `CRUDService/tests/postman/EmpowerNow.postman_collection.json`
- Request name: DCR IAT
- Method/URL: POST `https://idp.ocg.labs.empowernow.ai/api/admin/dcr/initial-access-tokens`
- Example JSON body:

```json
{
  "label": "ms-bff bootstrap",
  "expires_in": 3600,
  "max_usages": 1
}
```

Copy the token from the 201 Created response.

2) Put token into BFF environment (compose)

Edit `CRUDService/docker-compose-authzen4.yml` under the `bff:` service:

```yaml
environment:
  DCR_ENABLED: "true"
  SKIP_DCR_BOOTSTRAP: "false"
  IDP_BASE_URL: https://idp.ocg.labs.empowernow.ai/api/oidc
  DCR_IAT: "<paste_token_here>"
  ALLOW_BOOTSTRAP_FAILURE: "false"
```

3) Restart BFF and watch logs

```powershell
cd C:\source\repos\CRUDService
docker-compose -f docker-compose-authzen4.yml up -d bff
docker-compose -f docker-compose-authzen4.yml logs -f bff
```

Expect to see successful client registration and the service staying healthy. If it still fails, ensure the IAT is not expired, and that the IdP admin route is reachable from the BFF network.

## Notes

- IATs are short‑lived; create a new one if you see format/expiry errors.
- After initial bootstrap, credentials are cached; subsequent restarts should not require a new IAT unless you force replace.
- See also: BFF docs → How‑to → DCR Bootstrap for deeper context.


