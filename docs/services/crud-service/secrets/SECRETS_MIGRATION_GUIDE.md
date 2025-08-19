## Secrets Migration Guide: Canonical URIs and Pointers (OpenBao, File/CSI, DB)

Audience: Developers and DevOps. Purpose: replace plain .env secrets with secure pointers and canonical Secret URIs that resolve at runtime through the service’s `VaultService` PEP.

### TL;DR — What to use where

- **Platform/service secrets (rotatable, centralized)** → **OpenBao KVv2**
  - Pointer: `openbao+kv2://secret/<path>#<KEY>[?version=N]`
  - Examples: encryption keys, third‑party API keys, service bus connection strings.

- **Bootstrap secrets (must exist before app can call Vault)** → **File (Docker Secret / K8s CSI)**
  - Pointer: `file:primary:<name>` (defaults to `/run/secrets/<name>`)
  - Examples: DB connection string for Alembic, early SMTP password in dev.

- **App‑managed OAuth/API credentials (user‑created in UI/API)** → **Encrypted DB credential**
  - Pointer: `db:credentials:<uuid>`
  - Examples: Jira/ServiceNow OAuth clients created via `/api/crud/credentials` (Connections page).

- **Local‑only prototyping** → **YAML (dev)**
  - Pointer: `yaml://secret/<path>#<KEY>`

### Canonical Secret URIs — quick grammar

- Format: `provider[+engine]://mount/path#fragment?params`
- Lowercase provider/engine; `mount` is first path segment; case‑sensitive path.
- KVv2 version pin: `...?version=N` (never auto‑forward when pinned).
- Examples:
  - `openbao+kv2://secret/crud#CREDENTIAL_ENCRYPTION_KEY`
  - `openbao+kv2://secret/azure/msgraph#CLIENT_SECRET?version=3`
  - `file:primary:db-conn-string`
  - `db:credentials:0c1c2a22-1b71-44a2-8b2a-1b4d4a8f8d06`

### How resolution works (overview)

- All pointers flow through `VaultService` (PEP) for parse/normalize, tenant‑guard checks, PDP grant enforcement, provider fetch, and audits.
- Providers included: `openbao` (KVv2), `hashicorp` (KVv2), `file`, `db`, `yaml` (dev).

### Compose/K8s prerequisites

- Set once (already present in `docker-compose-authzen4.yml` for `crud-service`):
  - `VAULT_URL`, `VAULT_TOKEN`, `FILE_MOUNT_PATH=/run/secrets`
  - `TENANT_ID=dev`, `TENANT_ALLOWED_MOUNTS=secret`
  - Provide a non‑leaky salt: `SECRET_TENANT_SALT=...`
- Kubernetes CSI: mount secrets under a path (e.g., `/mnt/secrets-store`) and set `FILE_MOUNT_PATH=/mnt/secrets-store` in the workload.

### Migration steps (from .env to pointers)

1) Inventory all secret‑bearing variables in your `.env`.

2) Classify each as one of:
   - Bootstrap (needed before the app can reach Vault)
   - Platform/service (rotatable, centralized)
   - App‑managed OAuth/API credential (created by users)

3) Bootstrap → Docker Secret / K8s CSI (File provider)
   - Place secret material in `CRUDService/config_secrets/<name>.txt` (Compose) or mount via CSI.
   - Declare/mount under `secrets:` in Compose (or CSI volume in K8s).
   - Reference with `file:primary:<name>`.

4) Platform/service → OpenBao KVv2
   - Seed values via the Secrets API (below) or OpenBao UI/CLI.
   - Reference with `openbao+kv2://secret/<path>#<KEY>[?version=N]`.

5) App‑managed OAuth/API → DB credential
   - Create via Visual Designer or API `POST /api/crud/credentials`.
   - Reference with `db:credentials:<uuid>`.

6) Replace literals in your `.env`/compose env with the new pointers.

### Concrete mappings (examples)

- PostgreSQL (bootstrap)
```env
POSTGRES_USER=file:primary:db-user
POSTGRES_PASSWORD=file:primary:db-password
DATABASE_URL=file:primary:db-conn-string
```

- Encryption key (platform)
```env
CREDENTIAL_ENCRYPTION_KEY_POINTER=openbao+kv2://secret/crud#CREDENTIAL_ENCRYPTION_KEY
```

- OpenAI (platform)
```env
OPENAI_API_KEY=openbao+kv2://secret/ai/openai#API_KEY
```

- Service Bus (platform)
```env
SERVICE_BUS_CONNECTION_STRING=openbao+kv2://secret/azure/servicebus#CONNECTION_STRING
```

- SMTP (choose one)
```env
# Bootstrap via file (good for bring‑up)
SMTP_PASSWORD=file:primary:smtp-password
# Or centralized in OpenBao
# SMTP_PASSWORD=openbao+kv2://secret/email/smtp#PASSWORD
```

- App‑managed OAuth credential (created in UI/API)
```env
MY_SYSTEM_CREDENTIAL_POINTER=db:credentials:<uuid>
```

### Seeding and verification (dev)

- Create/Update a KVv2 secret via the CRUDService Secrets API:
```bash
curl -s -X POST "http://localhost:8000/api/secrets" \
  -H "Content-Type: application/json" \
  -d '{"uri":"openbao+kv2://secret/crud#CREDENTIAL_ENCRYPTION_KEY","value":"<base64-or-random>"}'
```

- Read a value to verify pointer resolution (dev‑mode guards relaxed):
```bash
curl -s "http://localhost:8000/api/secrets/value?uri=openbao+kv2://secret/crud#CREDENTIAL_ENCRYPTION_KEY"
```

- Watch live secret events during testing (SSE):
```bash
curl -N "http://localhost:8000/api/secrets/events"
```

### Creating app‑managed credentials

- Create a credential via API:
```bash
curl -s -X POST "http://localhost:8000/api/crud/credentials" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"jira-api",
    "type":"oauth2",
    "data":{
      "client_id":"...",
      "client_secret":"...",
      "auth_url":"...",
      "token_url":"...",
      "redirect_url":"https://automate.ocg.labs.empowernow.ai/auth/callback",
      "scope":"read write"
    }
  }'
```
- The response contains `id`. Reference it as: `db:credentials:<id>`.

- Frontend helper (Visual Designer):
```ts
credentialPointer(id) // → db:credentials:<id>
```

### Kubernetes CSI notes

- Mount secrets with Secrets Store CSI to a path such as `/mnt/secrets-store`.
- Set `FILE_MOUNT_PATH=/mnt/secrets-store` in the workload env.
- Use `file:primary:<name>` to reference mounted keys/files.
- Prefer `openbao+kv2://...` for platform secrets when you want versioning/rotation and central management.

### Security hardening (prod)

- Enable API guards in `crud-service`:
  - `SECRETS_API_REQUIRE_AUTH=true`
  - `SECRETS_ENFORCE_SCOPES=true`
  - `ENABLE_AUTHORIZATION=true`
- Keep `TENANT_ALLOWED_MOUNTS=secret`; set a strong `SECRET_TENANT_SALT`.
- Prefer OpenBao over YAML/file for long‑term storage (file is best for bootstrap only).

### Troubleshooting

- `TENANT_MOUNT_MISMATCH`/400 → your URI `mount` isn’t allowed; check `TENANT_ALLOWED_MOUNTS` and tenant id.
- KVv2 `?version=N`:
  - Soft‑deleted → typed error (HTTP 409) in provider tests.
  - Hard‑destroyed → typed error (HTTP 409) in provider tests.
- `file:` pointers:
  - Ensure the file exists under `FILE_MOUNT_PATH` (`/run/secrets` in Compose; your CSI mount in K8s).
  - For Windows dev, ensure path mappings do not interfere with container mount.

### Optional enhancement

- SSE payloads from `/api/secrets/events` can be enriched with `kv_version` and `resource_ref` for richer live views in UIs. Not required for analytics queries, but helpful for observability.

### Team checklist (copy/paste)

- [ ] Inventory .env secrets and classify (bootstrap / platform / app‑managed).
- [ ] Bootstrap → Docker Secret / K8s CSI; reference with `file:primary:<name>`; set `FILE_MOUNT_PATH`.
- [ ] Platform → OpenBao KVv2; seed via Secrets API; reference with `openbao+kv2://...`.
- [ ] App‑managed → create via `/api/crud/credentials`; reference `db:credentials:<uuid>`.
- [ ] Replace literals in `.env`/compose env with pointers.
- [ ] Verify with `/api/secrets/value?uri=...` and application flows; monitor `/api/secrets/events` during testing.
- [ ] In prod, enable secrets API auth/scope enforcement and PDP PEP gate.

---

References
- `CRUDService/docker-compose-authzen4.yml`
- `CRUDService/src/services/vault_service.py` (PEP)
- `CRUDService/src/vault_strategies/openbao_vault_strategy.py`, `.../db_vault_strategy.py`
- `CRUDService/src/api/secrets_routes.py` (Secrets API)
- `CRUDService/docs/secrets_v4_design.md` (design rationale, canonicalization, audits, grants)


