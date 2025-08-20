### BFF → CRUD TLS Enablement (Config‑Only) Guide

### Audience
DevOps and platform engineers

### Goal
Make BFF call CRUD over TLS in prod/stage with zero code changes, keeping dev simple.

### Scope
- In scope: Switching BFF’s upstream to CRUD over HTTPS via Traefik, config-only.
- Not in scope: App-level TLS on CRUD, mutual TLS (mTLS) between BFF and CRUD, CA pinning (documented as optional).

---

### Current state and constraints
- CRUD is externally fronted by Traefik: `https://crud.ocg.labs.empowernow.ai` and exposes `/health` over HTTPS.
- BFF reads CRUD base URL from `ServiceConfigs/BFF/config/service_settings.yaml`.
- BFF’s `httpx` client verifies TLS by default; no code changes are needed for HTTPS.

---

### The non‑overengineered approach
- Prod/Stage: BFF calls CRUD via `https://crud.ocg.labs.empowernow.ai/api` (through Traefik). Rely on standard TLS verification.
- Dev: Keep `http://crud-service:8000/api` (internal Docker network) to minimize local friction.

---

### Configuration changes (no code edits)

1) Prod/Stage config
- File: `ServiceConfigs/BFF/config/service_settings.yaml`
- Set CRUD to HTTPS:
```yaml
services:
  crud_service:
    base_url: "https://crud.ocg.labs.empowernow.ai/api"
    token_audience: "https://crud.ocg.labs.empowernow.ai"
    # retain existing timeouts/caching as-is
```

2) Dev config
- Keep the internal container URL:
```yaml
services:
  crud_service:
    base_url: "http://crud-service:8000/api"
    token_audience: "https://crud.ocg.labs.empowernow.ai"
```

Notes:
- `token_audience` should already match the HTTPS host. Confirm it remains `https://crud.ocg.labs.empowernow.ai`.

---

### Deployment steps

- Commit the updated `service_settings.yaml` in `ServiceConfigs/BFF/config` (per your environment branching or overlays).
- Restart or redeploy the BFF service:
  - Docker Compose: restart only the BFF container.
  - Kubernetes: roll the BFF deployment to pick up the mounted config/ConfigMap.

Environment variable overrides
- Ensure the BFF loads settings from the mounted config path (default in compose: `ServiceConfigs/BFF/config → /app/config`).
- If your BFF supports `SETTINGS_FILE`, make sure it points to `/app/config/service_settings.yaml` where appropriate.

---

### Validation

- From a client (or test harness) perform a BFF call that triggers a CRUD upstream request (e.g., an endpoint that lists workflows/forms).
- Check BFF logs for the upstream base to confirm HTTPS usage. You should see references to the CRUD host with `https://crud.ocg.labs.empowernow.ai`.
- Optional quick check (connectivity only): `curl -I https://crud.ocg.labs.empowernow.ai/health` should return 200.

Common success indicators
- BFF responses remain 2xx for routes backed by CRUD.
- No TLS verification errors in BFF logs.
- No change required for dev/local workflows.

---

### Rollback plan
- Revert `crud_service.base_url` to the previous HTTP value:
```yaml
services:
  crud_service:
    base_url: "http://crud-service:8000/api"
```
- Redeploy the BFF.

---

### Troubleshooting

- 404 after change:
  - Verify you called a BFF endpoint that actually proxies to CRUD.
  - Ensure Traefik has the CRUD router and the host resolves (DNS/hosts entry if needed).
- TLS certificate errors:
  - Confirm that the container can resolve and reach `crud.ocg.labs.empowernow.ai` and that system CA trusts the cert chain used by Traefik.
  - If you use a private CA in front of Traefik (uncommon here), consider optional CA pinning (see below).
- The BFF still calls HTTP:
  - Confirm the running BFF picked up `ServiceConfigs/BFF/config/service_settings.yaml`.
  - Ensure you didn’t override `crud_service.base_url` with environment variables.

---

### Optional hardening (future, only if required)

CA pinning
- Add (config + minimal code) to use a specific CA bundle if your Traefik uses a private CA.
- Config example:
```yaml
services:
  crud_service:
    base_url: "https://crud.ocg.labs.empowernow.ai/api"
    tls_verify: "/app/config/ca/prod-ca.crt"   # Mounted CA bundle
```
- Mount the CA bundle into the BFF container at `/app/config/ca/prod-ca.crt`.

Mutual TLS (mTLS)
- Only if mandated by security policy. You’ll need:
  - BFF client cert/key mounted as secrets: `/app/config/certs/bff.crt`, `/app/config/certs/bff.key`.
  - Traefik (or CRUD app) to require and validate client certs.
- Config example:
```yaml
services:
  crud_service:
    base_url: "https://crud.ocg.labs.empowernow.ai/api"
    client_cert_path: "/app/config/certs/bff.crt"
    client_key_path: "/app/config/certs/bff.key"
```
- Keep this off by default to avoid developer friction.

Operational guardrails
- Do not set `verify: false` in production.
- Keep dev simple and isolate extra security knobs behind environment-specific settings.

---

### Change control checklist

- Config updated in `ServiceConfigs/BFF/config/service_settings.yaml`
- Dev environment left unchanged (internal HTTP)
- BFF redeployed (config loaded)
- Validation completed (BFF calling CRUD over HTTPS; logs clean)
- Rollback plan documented

---

### FAQ

- Do we need code changes for Phase 1?
  - No. `httpx` verifies TLS by default. This is purely a config change.

- Will this break dev?
  - No. Dev continues to use the internal HTTP URL.

- Can we later enforce stricter security?
  - Yes. Optional CA pinning and mTLS are outlined above and can be toggled per environment without impacting dev.

- Why route through Traefik instead of direct in-cluster TLS?
  - It’s the simplest, least risky path now. If desired later, we can add app-level TLS or internal ingress with a private CA + mTLS.

---

- This plan enables TLS between BFF and CRUD in prod/stage with a single configuration change, zero code edits, minimal operational risk, and a straightforward rollback.