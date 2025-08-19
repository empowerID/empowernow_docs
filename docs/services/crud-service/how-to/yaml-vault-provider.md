---
title: YAML Vault Provider (dev-only)
description: File-backed secrets provider for fast local iteration using canonical URIs and the same PEP/PDP seams.
---

The YAML Vault Provider is a development-only secret provider that reads key/values from a YAML file on disk. It lets you iterate locally without a running Vault server while still exercising Canonical URI, PEP/PDP, and audit seams used by real providers.

:::danger Dev-only
Do not use in production. Writes and deletes are blocked when `ENVIRONMENT` is not `dev`/`test`. Never commit real secrets to Git; keep the YAML file under a gitignored path.
:::

### Visual: dev provider in the architecture
```mermaid
graph LR
  DevApp[Dev client/workflow] --> CRUD[CRUDService]
  CRUD --> PEP[VaultService (PEP)]
  PEP --> PDP[SecretPolicyService (PDP)]
  PEP --> YAML[Yaml Provider]
  YAML --> File[(dev_secrets.yaml)]
  PEP --> AUD[Audit]
```

### When to use
- **Local dev and tests** when you need quick, file-backed secrets.
- Do not use in production. Use OpenBao/HashiCorp providers there.

### Configuration
- **Environment**
  - `YAML_VAULT_PATH`: absolute or container path to the YAML file.
  - Recommended host path: `ServiceConfigs/CRUDService/config/data/dev_secrets.yaml`
  - Recommended container path: `/app/config/data/dev_secrets.yaml`

- **File structure**
```yaml
secret:
  env:
    MY_API_KEY: abc123
    OPENLDAP_LDAP_PASSWORD: secret
  crud:
    DB_USER: app
    DB_PASS: s3cr3t
```

### Canonical URIs
- Scheme: `yaml`
- No authority. First path segment is the mount (e.g., `secret`). The second segment is the namespace/prefix (e.g., `env`, `crud`). The fragment identifies the key.

Examples:
```text
yaml://secret/env#MY_API_KEY
yaml://secret/crud#DB_PASS
```

If tenant mount guards are enabled, ensure your `TENANT_ALLOWED_MOUNTS` includes `secret` (or your chosen mount).

### Using from code
```python
from src.services.vault_service import VaultService

# Ensure YAML_VAULT_PATH is set
svc = VaultService(ttl=60)
creds = await svc.get_credentials("yaml://secret/env#MY_API_KEY", execution_context=ctx)
# → {"MY_API_KEY": "abc123"}
```

### Bootstrap script
Use `scripts/yaml_dev_bootstrap.py` to populate the YAML file from `.env` sources.

#### Single-source mode
```powershell
# Write all process env + .env into secret/env
python scripts/yaml_dev_bootstrap.py --env-file .env --out ..\ServiceConfigs\CRUDService\config\data\dev_secrets.yaml --mount secret

# Only selected keys (allowlist)
python scripts/yaml_dev_bootstrap.py --env-file .env --out ..\ServiceConfigs\CRUDService\config\data\dev_secrets.yaml --mount secret --include "OPENLDAP_LDAP_PASSWORD,MY_API_KEY"

# Different prefix under the same mount
python scripts/yaml_dev_bootstrap.py --env-file .env --out ..\ServiceConfigs\CRUDService\config\data\dev_secrets.yaml --mount secret --prefix crud
```

#### Manifest mode (multi-source)
Create a manifest that enumerates multiple `.env` files and prefixes:
```yaml
# scripts/bootstrap_manifest.yaml
entries:
  - prefix: crud
    env_file: ../CRUDService/.env
    include_process_env: false
  - prefix: pdp
    env_file: ../pdp/.env
    include_process_env: false
  - prefix: analytics
    env_file: ../analytics/.env
    include_process_env: false
  - prefix: membership
    env_file: ../membership/.env
    include_process_env: false
  - prefix: namingservice
    env_file: ../NamingService/.env
    include_process_env: false
  - prefix: idp
    env_file: ../IdP/.env
    include_process_env: false
```

Run the manifest:
```powershell
python scripts/yaml_dev_bootstrap.py --manifest scripts/bootstrap_manifest.yaml --out ..\ServiceConfigs\CRUDService\config\data\dev_secrets.yaml --mount secret --clear
```

Flags:
- **--out**: Target YAML file path (required)
- **--mount**: Top-level mount key (default: `secret`)
- **--env-file**: Single `.env` file to import
- **--include**: Comma-separated allowlist (only write these keys)
- **--prefix**: Namespace under the mount (default: `env`)
- **--manifest**: YAML manifest of entries (prefix/env_file/include/include_process_env)
- **--clear**: Remove the existing output file before writing

Notes:
- Re-running merges into the same file unless `--clear` is set.
- The script is dev-only; do not commit sensitive values.

### Secrets API (YAML provider)
With the YAML provider enabled, the CRUDService exposes endpoints for dev workflows (policy-protected):
- `POST /api/secrets` create/update
- `GET /api/secrets?uri=yaml://secret/env#KEY` read
- `DELETE /api/secrets?uri=yaml://secret/env#KEY[&destroy=true]` delete/destroy (dev semantics)
- `GET /api/secrets/metadata?mount=secret&prefix=env` metadata-only listing
- `GET /api/secrets/keys?mount=secret&prefix=env` key enumeration

Example (PowerShell):
```powershell
curl -X POST "http://localhost:9100/api/secrets" -H "Content-Type: application/json" -d '{
  "uri": "yaml://secret/env#MY_NEW",
  "value": {"MY_NEW": "value"}
}'

curl "http://localhost:9100/api/secrets?uri=yaml://secret/env#MY_NEW"

curl -X DELETE "http://localhost:9100/api/secrets?uri=yaml://secret/env#MY_NEW"
```

### Troubleshooting
- Ensure `YAML_VAULT_PATH` points to the same file mounted in the service container.
- If tenant mount guards are enabled, include `secret` in `TENANT_ALLOWED_MOUNTS`.
- Use `--include` to avoid dumping your entire OS environment by accident.


