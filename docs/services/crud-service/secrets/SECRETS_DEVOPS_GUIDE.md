---
title: Secrets Management DevOps Guide
description: How to run CRUDService secrets across Docker/Kubernetes and automate reads/rotation from CI (GitHub Actions)
---

## Secrets Management DevOps Guide (Docker, Kubernetes, GitHub)

This guide explains how to run and consume the CRUDService secrets engine across Docker and Kubernetes, and how to automate secret reads/rotations from CI (GitHub Actions). It is derived from the production code paths and supported providers.

### What this implements

- Providers: `yaml` (dev-only), `openbao+kv2`, `hashicorp+kv2` via hvac
- Canonical URIs: `<provider>[+engine]://<mount>/<path>#<fragment>?<params>`
- Endpoints: CRUD, rotate, versions/metadata, bulk, copy/move, SSE events
- PEP: VaultService enforces PDP decisions, audience/scope, sender-binding, anti-replay

Key implementation references:

- Rotation endpoint and PDP/scope enforcement
  - `CRUDService/src/api/secrets_routes.py` → POST `/api/secrets/rotate`
- Rotation controller (KVv2): write new version + best-effort old/new lookup + Kafka audit
  - `CRUDService/src/services/rotation_controller.py`
- Provider strategies: OpenBao/HashiCorp KVv2 via hvac
  - `CRUDService/src/vault_strategies/openbao_vault_strategy.py`
- Canonical URI parser and tenant mount guard
  - `CRUDService/src/secret_uri.py`
- System mapping to APIs (internal service-to-service use)
  - `ServiceConfigs/CRUDService/config/systems/secrets.yaml`


## 1) Configuration model

### Global env (PEP, policy, audits)

- `TENANT_ID` (default: `dev`)
- `TENANT_ALLOWED_MOUNTS` (CSV, e.g. `secret,kv`) – tenant mount guard
- `SECRETS_AUDIENCE` (default: `crud.secrets`) – expected audience when `aud` present
- `SECRETS_API_REQUIRE_AUTH` (default: `false`) – require session/bearer on `/api/secrets/*`
- `SECRETS_ENFORCE_SCOPES` (default: `false`) – enforce per-endpoint scopes
- `TENANT_SALT` or `SECRET_TENANT_SALT` – HMAC salt to compute non‑leaky `resource_ref` in audits
- `ENVIRONMENT` – non‑dev disables YAML writes/deletes

Optional fallback toggles (not recommended for prod):

- `VAULT_ENABLE_FALLBACK`, `VAULT_FALLBACK_ORDER` – provider fallback when a secret/path is missing

### Provider configuration (Vault-compatible)

For `openbao` or `hashicorp` (KVv2):

- Required keys (env): `OPENBAO_URL`/`HASHICORP_URL` (or `VAULT_URL`), and either `OPENBAO_TOKEN`/`HASHICORP_TOKEN` (or `VAULT_TOKEN`) or AppRole with `OPENBAO_ROLE_ID` + `OPENBAO_SECRET_ID` (analogous for HashiCorp)
- Optional: `VAULT_TIMEOUT`, `VAULT_VERIFY_SSL` (`true`/`false`), `VAULT_POOL_SIZE`, `VAULT_TOKEN_RENEWAL_THRESHOLD`, `VAULT_MAX_CONCURRENT_OPERATIONS`

Dev YAML provider:

- `YAML_VAULT_PATH` – path to dev secrets YAML (e.g., `/app/config/data/dev_secrets.yaml`)


## 2) Docker Compose

### Dev (YAML provider)

```yaml
services:
  crudservice:
    image: your-registry/crudservice:latest
    environment:
      ENVIRONMENT: dev
      YAML_VAULT_PATH: /app/config/data/dev_secrets.yaml
      TENANT_ID: dev
      TENANT_ALLOWED_MOUNTS: secret
      SECRETS_API_REQUIRE_AUTH: "false"
      SECRETS_ENFORCE_SCOPES: "false"
      # Optional auditing salt
      # TENANT_SALT: "..."
    volumes:
      - ../ServiceConfigs/CRUDService/config/data/dev_secrets.yaml:/app/config/data/dev_secrets.yaml:ro
    ports:
      - "9100:9100"
```

Populate YAML quickly from local `.env` files using the bootstrap script (dev only):

```powershell
python scripts/yaml_dev_bootstrap.py --manifest scripts/bootstrap_manifest.yaml --out ..\ServiceConfigs\CRUDService\config\data\dev_secrets.yaml --mount secret --clear
```

### Prod (OpenBao KVv2)

```yaml
services:
  crudservice:
    image: your-registry/crudservice:latest
    environment:
      ENVIRONMENT: prod
      TENANT_ID: acme
      TENANT_ALLOWED_MOUNTS: secret
      SECRETS_API_REQUIRE_AUTH: "true"
      SECRETS_ENFORCE_SCOPES: "true"
      SECRETS_AUDIENCE: crud.secrets
      TENANT_SALT: ${TENANT_SALT}
      # Vault-compatible provider (OpenBao shown)
      OPENBAO_URL: https://openbao.acme.local
      OPENBAO_TOKEN: ${OPENBAO_TOKEN} # or use AppRole below
      # OPENBAO_ROLE_ID: ${OPENBAO_ROLE_ID}
      # OPENBAO_SECRET_ID: ${OPENBAO_SECRET_ID}
      VAULT_TIMEOUT: 30
      VAULT_VERIFY_SSL: "true"
      VAULT_POOL_SIZE: 10
      VAULT_TOKEN_RENEWAL_THRESHOLD: 600
      VAULT_MAX_CONCURRENT_OPERATIONS: 50
    ports:
      - "9100:9100"
```

Notes:

- The service reads secrets provider credentials from environment variables (no `_FILE` convention). Inject them through your secret management for Compose deployments.
- For HashiCorp Vault, replace `OPENBAO_*` with `HASHICORP_*` (same keys) or use `VAULT_*` fallbacks where applicable.


## 3) Kubernetes

Use a `Secret` for tokens/AppRole, and a `ConfigMap` (or inline env) for non‑sensitive settings.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: crud-secrets-provider
type: Opaque
stringData:
  OPENBAO_TOKEN: "${OPENBAO_TOKEN}"
  # Or AppRole:
  # OPENBAO_ROLE_ID: "..."
  # OPENBAO_SECRET_ID: "..."
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: crud-config
data:
  ENVIRONMENT: "prod"
  TENANT_ID: "acme"
  TENANT_ALLOWED_MOUNTS: "secret"
  SECRETS_API_REQUIRE_AUTH: "true"
  SECRETS_ENFORCE_SCOPES: "true"
  SECRETS_AUDIENCE: "crud.secrets"
  VAULT_VERIFY_SSL: "true"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crudservice
spec:
  replicas: 2
  selector:
    matchLabels:
      app: crudservice
  template:
    metadata:
      labels:
        app: crudservice
    spec:
      containers:
        - name: crudservice
          image: your-registry/crudservice:latest
          ports:
            - containerPort: 9100
          env:
            - name: ENVIRONMENT
              valueFrom: { configMapKeyRef: { name: crud-config, key: ENVIRONMENT } }
            - name: TENANT_ID
              valueFrom: { configMapKeyRef: { name: crud-config, key: TENANT_ID } }
            - name: TENANT_ALLOWED_MOUNTS
              valueFrom: { configMapKeyRef: { name: crud-config, key: TENANT_ALLOWED_MOUNTS } }
            - name: SECRETS_API_REQUIRE_AUTH
              valueFrom: { configMapKeyRef: { name: crud-config, key: SECRETS_API_REQUIRE_AUTH } }
            - name: SECRETS_ENFORCE_SCOPES
              valueFrom: { configMapKeyRef: { name: crud-config, key: SECRETS_ENFORCE_SCOPES } }
            - name: SECRETS_AUDIENCE
              valueFrom: { configMapKeyRef: { name: crud-config, key: SECRETS_AUDIENCE } }
            - name: OPENBAO_URL
              value: "https://openbao.acme.local"
            - name: OPENBAO_TOKEN
              valueFrom: { secretKeyRef: { name: crud-secrets-provider, key: OPENBAO_TOKEN } }
            # Or AppRole:
            # - name: OPENBAO_ROLE_ID
            #   valueFrom: { secretKeyRef: { name: crud-secrets-provider, key: OPENBAO_ROLE_ID } }
            # - name: OPENBAO_SECRET_ID
            #   valueFrom: { secretKeyRef: { name: crud-secrets-provider, key: OPENBAO_SECRET_ID } }
            - name: VAULT_TIMEOUT
              value: "30"
            - name: VAULT_VERIFY_SSL
              valueFrom: { configMapKeyRef: { name: crud-config, key: VAULT_VERIFY_SSL } }
            - name: VAULT_POOL_SIZE
              value: "10"
            - name: VAULT_TOKEN_RENEWAL_THRESHOLD
              value: "600"
            - name: VAULT_MAX_CONCURRENT_OPERATIONS
              value: "50"
```

Dev on Kubernetes with YAML provider (not recommended beyond local clusters): mount a `ConfigMap` with `dev_secrets.yaml` and set `YAML_VAULT_PATH` accordingly.


## 4) CI automation (GitHub Actions)

The API supports reads and rotations with PDP/scope enforcement. When `SECRETS_API_REQUIRE_AUTH=true` and `SECRETS_ENFORCE_SCOPES=true`, the access token must carry:

- Audience: `crud.secrets` (or your `SECRETS_AUDIENCE`)
- Scopes: e.g., `secrets.read`, `secrets.rotate`, etc.

Example: rotate a KVv2 secret fragment via GitHub Actions.

```yaml
name: Rotate secret
on:
  workflow_dispatch:
jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - name: Call CRUDService rotate (OpenBao KVv2)
        env:
          API_BASE: ${{ secrets.CRUD_BASE_URL }} # e.g., https://crud.yourdomain
          TOKEN: ${{ secrets.CRUD_BEARER_TOKEN }} # must include audience/scope
        run: |
          uri="openbao+kv2://secret/app/api#token"
          body=$(jq -nc --arg u "$uri" --argjson v '{"token":"new-value"}' '{uri:$u, value:$v}')
          curl -sS -X POST "$API_BASE/api/secrets/rotate" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            --data "$body"
```

Read a pinned version:

```yaml
      - name: Read versioned value
        env:
          API_BASE: ${{ secrets.CRUD_BASE_URL }}
          TOKEN: ${{ secrets.CRUD_BEARER_TOKEN }}
        run: |
          uri="openbao+kv2://secret/app/api#token&version=12"
          curl -sS "$API_BASE/api/secrets/value?uri=$uri" -H "Authorization: Bearer $TOKEN"
```

Bulk operations (set/delete/undelete/destroy/rotate) are available via POST `/api/secrets/bulk`.


## 5) Supported operations and examples

All operations use Canonical URIs. For KVv2, fragments represent individual keys within the secret object; without a fragment, payloads must be JSON objects.

- Read (provider-backed):

```bash
curl "$CRUD/api/secrets/value?uri=openbao+kv2://secret/app/api#token" -H "Authorization: Bearer $TOKEN"
```

- Rotate (YAML dev behaves like update):

```bash
curl -X POST "$CRUD/api/secrets/rotate" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "uri": "openbao+kv2://secret/app/api#token",
  "value": {"token":"s3cr3t-new"}
}'
```

- Versions metadata:

```bash
curl "$CRUD/api/secrets/versions?uri=openbao+kv2://secret/app/api" -H "Authorization: Bearer $TOKEN"
```

- Undelete versions:

```bash
curl -X POST "$CRUD/api/secrets/undelete" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "uri": "openbao+kv2://secret/app/api",
  "versions": [3,4]
}'
```

- Destroy versions:

```bash
curl -X POST "$CRUD/api/secrets/destroy-versions" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "uri": "openbao+kv2://secret/app/api",
  "versions": [1,2]
}'
```


## 6) Security guidance

- Enable `SECRETS_API_REQUIRE_AUTH` and `SECRETS_ENFORCE_SCOPES` in production
- Prefer AppRole (role_id/secret_id) over static tokens for Vault
- Keep `VAULT_VERIFY_SSL=true`; only disable for controlled dev clusters
- Restrict `TENANT_ALLOWED_MOUNTS` to the precise set used per tenant
- Set `TENANT_SALT` to enable non‑leaky audit references in Kafka and SSE
- YAML provider is dev‑only; it is automatically blocked for writes/deletes when `ENVIRONMENT` is not dev/test


## 7) Troubleshooting

- 403 on rotate/read: missing scope or PDP denial; ensure token scopes and PDP rules allow the operation
- 400 `UNSUPPORTED_ENGINE`: canonical URI engine not supported (KVv2 required for Vault providers)
- 400 `TENANT_MOUNT_MISMATCH`: mount not in `TENANT_ALLOWED_MOUNTS`
- 404 on fragment: path exists but key is absent – check fragment vs object payload
- Token renewal failures: check provider token/AppRole and network access; hvac renewal is automatic before reads/writes
- Version errors on pinned reads: deleted/destroyed versions raise explicit errors; omit `version` to read latest


## 8) Internal service mapping

Internal components can call the secrets API using the system mapping at `ServiceConfigs/CRUDService/config/systems/secrets.yaml` (inject `INTERNAL_EXECUTION_TOKEN`). This mapping exposes `value`, `create_or_update`, `delete`, `destroy`, `rotate`, `bulk`, `copy`, `move`, and metadata operations that forward to the HTTP endpoints.


