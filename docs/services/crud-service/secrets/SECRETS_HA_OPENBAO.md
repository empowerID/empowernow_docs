---
title: OpenBao to Production — HA, Load Balancing, and Integration
description: Plan and run OpenBao (Vault-compatible) in HA with Raft and a load balancer, and wire CRUDService securely
---

## OpenBao to Production: High-Availability (HA), Load Balancing, and Integration

This guide explains how to take our secrets engine to production with OpenBao (Vault-compatible), enable HA with Raft, front it with a load balancer (Traefik), and wire our CRUDService to use it securely. All steps and config align with code in this repo and the existing Docker Compose stack.

References in this repository:

- OpenBao dev container (for local): see `openbao` service in `CRUDService/docker-compose-authzen4.yml`.
- CRUDService provider env wiring (fallbacks): `src/services/vault_service.py` → `load_provider_config_generic` uses `OPENBAO_*` or `VAULT_*` env keys.
- OpenBao KVv2 strategy: `src/vault_strategies/openbao_vault_strategy.py` (token renewal, KVv2 read/write, versions/lifecycle).
- Canonical URIs and tenant guard: `src/secret_uri.py`.
- Secrets API and rotation controller: `src/api/secrets_routes.py`, `src/services/rotation_controller.py`.


## 1) Plan the HA topology

- Run 3–5 OpenBao nodes with Raft storage for quorum.
- Each node serves HTTPS for clients (`api_addr`) and a cluster address (`cluster_addr`).
- Put a load balancer (Traefik) in front for client traffic, or point the client (CRUDService) to any node URL (the hvac client follows leader redirects). We recommend a LB URL for stable DNS.
- Use KVv2 at mount `secret` (matches our default tenant guard and examples).


## 2) Configure OpenBao nodes (Raft + TLS)

Example node config (HCL), repeat per node with unique ports and raft path:

```hcl
storage "raft" {
  path    = "/opt/openbao/data"
  node_id = "node1"
}

listener "tcp" {
  address             = "0.0.0.0:8200"
  cluster_address     = "0.0.0.0:8201"
  tls_disable         = 0
  tls_cert_file       = "/opt/openbao/tls/server.crt"
  tls_key_file        = "/opt/openbao/tls/server.key"
  tls_client_ca_file  = "/opt/openbao/tls/ca.crt"
}

api_addr     = "https://openbao-1.internal:8200"
cluster_addr = "https://openbao-1.internal:8201"

disable_mlock = true
ui            = true
```

Initialization and join (run on the first node, then join others):

```bash
# On node 1 only
openbao operator init -key-shares=5 -key-threshold=3 > /tmp/init.json
openbao operator unseal $(jq -r '.unseal_keys_b64[0]' /tmp/init.json)
openbao operator unseal $(jq -r '.unseal_keys_b64[1]' /tmp/init.json)
openbao operator unseal $(jq -r '.unseal_keys_b64[2]' /tmp/init.json)

# On node 2/3: start with same config (different node_id/path), then join raft
openbao operator raft join https://openbao-1.internal:8200
openbao operator unseal <key1>
openbao operator unseal <key2>
openbao operator unseal <key3>
```

Enable KVv2 at `secret` and create a policy and AppRole for CRUDService:

```bash
# Set root token from init.json for bootstrap only
export VAULT_ADDR=https://openbao-1.internal:8200
export VAULT_TOKEN=$(jq -r .root_token /tmp/init.json)

# Enable KV v2 at mount "secret" (idempotent)
openbao secrets enable -path=secret -version=2 kv

# Policy: read/write/metadata on our namespace
cat > crudservice.hcl <<'POL'
path "secret/*" {
  capabilities = ["create", "update", "read", "list", "delete"]
}
path "sys/leases/*" { capabilities = ["read", "list"] }
POL
openbao policy write crudservice crudservice.hcl

# AppRole for CRUDService (recommended over static tokens)
openbao auth enable approle || true
openbao write auth/approle/role/crudservice token_policies="crudservice" token_ttl="1h" token_max_ttl="4h"
openbao read -format=json auth/approle/role/crudservice/role-id | jq -r .data.role_id
openbao write -format=json -f auth/approle/role/crudservice/secret-id | jq -r .data.secret_id
```

Store `role_id` and `secret_id` (or mint a periodic token) in your secret store for the platform (Kubernetes Secret, Azure Key Vault, etc.).


## 3) Expose OpenBao via Traefik (Load balancer URL)

In our stack, Traefik is already present (`traefik` service in `docker-compose-authzen4.yml`). For HA with multiple OpenBao nodes, define a file-based Traefik service with multiple backends and a router. Example `traefik/dynamic.yml` addition:

```yaml
http:
  services:
    openbao-cluster:
      loadBalancer:
        servers:
          - url: "https://openbao-1.internal:8200"
          - url: "https://openbao-2.internal:8200"
          - url: "https://openbao-3.internal:8200"
        passHostHeader: true
  routers:
    openbao:
      rule: Host(`vault.ocg.labs.empowernow.ai`)
      entryPoints: [websecure]
      tls: {}
      service: openbao-cluster
```

Ensure Traefik trusts OpenBao’s TLS CA (mount CA into Traefik or use ACME certs for public DNS).

Note: In `docker-compose-authzen4.yml`, we currently run a dev OpenBao (`command: ["server", "-dev", ...]`) and expose it via Traefik labels:

```yaml
openbao:
  image: ghcr.io/openbao/openbao:latest
  # ...
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.openbao.rule=Host(`vault.ocg.labs.empowernow.ai`)"
    - "traefik.http.routers.openbao.entrypoints=websecure"
    - "traefik.http.routers.openbao.tls=true"
    - "traefik.http.services.openbao.loadbalancer.server.port=8200"
```

For production, replace the dev container with three HA nodes configured as above, and use the file-defined `openbao-cluster` service to load-balance across them.


## 4) Point CRUDService to OpenBao (production settings)

Our code reads provider config via `OPENBAO_*` (or `VAULT_*` fallbacks). Update the CRUDService env in Compose/Kubernetes to target the LB URL and enable SSL verification.

From `docker-compose-authzen4.yml` (dev snippet today):

```yaml
# dev (uses VAULT_* fallbacks)
- VAULT_URL=http://openbao:8200
- VAULT_TOKEN=root
- VAULT_VERIFY_SSL=False
```

Production override (recommend using provider-specific keys):

```yaml
environment:
  OPENBAO_URL: https://vault.ocg.labs.empowernow.ai
  # Use AppRole (preferred) or token
  # OPENBAO_ROLE_ID: ${OPENBAO_ROLE_ID}
  # OPENBAO_SECRET_ID: ${OPENBAO_SECRET_ID}
  OPENBAO_TOKEN: ${OPENBAO_TOKEN}          # optional if not using AppRole
  VAULT_TIMEOUT: 30
  VAULT_VERIFY_SSL: "true"
  VAULT_POOL_SIZE: 10
  VAULT_TOKEN_RENEWAL_THRESHOLD: 600
  VAULT_MAX_CONCURRENT_OPERATIONS: 50
  TENANT_ID: acme
  TENANT_ALLOWED_MOUNTS: secret
  SECRETS_API_REQUIRE_AUTH: "true"
  SECRETS_ENFORCE_SCOPES: "true"
  SECRETS_AUDIENCE: crud.secrets
  TENANT_SALT: ${TENANT_SALT}
```

Notes:

- Our hvac client accepts `verify=True`; if using a private CA, install the CA bundle in the container trust store or set `REQUESTS_CA_BUNDLE=/path/ca.crt` in the container environment.
- The code enforces KVv2 for writes/rotation; keep the `secret` mount as KVv2.
- Tenant guard will reject mounts not in `TENANT_ALLOWED_MOUNTS`.


## 5) Verify integration with real API calls

Rotation (controller: `RotationController.rotate_kvv2`) and reads (PEP: `VaultService.get_credentials`) are wired via the Secrets API.

Rotate a fragment at `secret/app/api#token`:

```bash
curl -sS -X POST "$CRUD_BASE/api/secrets/rotate" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data '{
    "uri": "openbao+kv2://secret/app/api#token",
    "value": {"token": "new-value"}
  }'
```

Read current value (provider-backed):

```bash
curl -sS "$CRUD_BASE/api/secrets/value?uri=openbao+kv2://secret/app/api#token" \
  -H "Authorization: Bearer $TOKEN"
```

Version metadata (KVv2):

```bash
curl -sS "$CRUD_BASE/api/secrets/versions?uri=openbao+kv2://secret/app/api" \
  -H "Authorization: Bearer $TOKEN"
```


## 6) Scaling and clustering operations

- Add a node: bring up a new node with the same Raft config (new `node_id`), run `openbao operator raft join https://leader:8200`, unseal with quorum keys.
- Replace a node: stop node, remove from raft (if needed) with `openbao operator raft remove-peer`, add replacement via join.
- Autopilot and snapshots: enable periodic raft snapshots and monitor autopilot health for drift.


## 7) Security hardening checklist

- TLS everywhere (client and cluster addresses); rotate certs on schedule.
- Use AppRole or short‑lived tokens; ensure token can be renewed (our strategy calls `lookup_self` and `renew_self`).
- Restrict policies to minimal paths (e.g., `secret/app/*` instead of `secret/*` when possible).
- In CRUDService, enable `SECRETS_API_REQUIRE_AUTH` and `SECRETS_ENFORCE_SCOPES` and set `SECRETS_AUDIENCE`.
- Set `TENANT_SALT` to enable non‑leaky audit references.
- Keep `TENANT_ALLOWED_MOUNTS` tight (e.g., `secret` only).


## 8) Kubernetes example (optional)

Use a Service/Ingress for the OpenBao cluster and inject provider creds into CRUDService via `Secret`:

```yaml
apiVersion: v1
kind: Secret
metadata: { name: crud-openbao }
stringData:
  OPENBAO_ROLE_ID: "..."
  OPENBAO_SECRET_ID: "..."
---
apiVersion: apps/v1
kind: Deployment
metadata: { name: crudservice }
spec:
  template:
    spec:
      containers:
        - name: crud
          image: your-registry/crudservice:latest
          env:
            - name: OPENBAO_URL
              value: https://vault.ocg.labs.empowernow.ai
            - name: OPENBAO_ROLE_ID
              valueFrom: { secretKeyRef: { name: crud-openbao, key: OPENBAO_ROLE_ID } }
            - name: OPENBAO_SECRET_ID
              valueFrom: { secretKeyRef: { name: crud-openbao, key: OPENBAO_SECRET_ID } }
            - name: VAULT_VERIFY_SSL
              value: "true"
            - name: TENANT_ALLOWED_MOUNTS
              value: secret
            - name: SECRETS_API_REQUIRE_AUTH
              value: "true"
            - name: SECRETS_ENFORCE_SCOPES
              value: "true"
```


## 9) Why this is “real” in our codebase

- The OpenBao strategy uses hvac with token renewal and KVv2 helpers: see `openbao_vault_strategy.py` (`create_or_update_secret`, `read_secret_metadata`, `undelete_versions`, `destroy_secret_versions`).
- Provider configuration and fallbacks are loaded from env: `vault_service.py` → `load_provider_config_generic` accepts `OPENBAO_URL`, `OPENBAO_TOKEN`, AppRole env, or `VAULT_URL`/`VAULT_TOKEN` fallbacks; `VAULT_VERIFY_SSL` is respected and coerced to boolean.
- The Secrets API endpoints call the PEP (`VaultService.get_credentials`) and controller (`RotationController`), enforcing PDP purposes and optional OAuth scopes (`SECRETS_ENFORCE_SCOPES`).
- The Compose stack already exposes OpenBao and CRUDService; see `docker-compose-authzen4.yml` for dev defaults and Traefik routing we build upon for production HA.


