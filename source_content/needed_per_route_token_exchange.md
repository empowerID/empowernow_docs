### Goal
Per-route token policy in the BFF so each upstream call uses the right, least‑privilege token (client_credentials or on_behalf_of), minted and attached server‑side. No browser exposure, minimal session token, predictable upstream audience/scope.

### High‑level architecture
- BFF Dynamic Router reads routes.yaml → builds RouteConfig objects with token policy.
- Proxy executes per-route policy:
  - session_passthrough: forward end‑user access token (current default).
  - service_token: mint/refresh and attach client_credentials token.
  - on_behalf_of: exchange end‑user token for a constrained upstream token (OBO).
- TokenManager:
  - Centralized mint/refresh/cache for service and OBO tokens.
  - Service registry defines per‑service audience/scopes/clients.

### Token taxonomy and configuration
- Login/session token (user → BFF)
  - Flow: Authorization Code + PKCE using client `bff-server` with `private_key_jwt`.
  - Scopes requested by the UI (from config/logs): `openid profile email offline_access admin.api application.all dcr.register`.
  - Audience: IdP default for `bff-server` (generic, e.g., `empowernow`). Not the CRUD/Admin API audiences.
  - Storage: Access/refresh held server‑side in the BFF session (Redis). Browser only has an httpOnly session cookie.

- Backend tokens minted by BFF (to upstreams)
  - service_token (Client Credentials)
    - Flow: BFF mints CC via `bff-server` (PKJWT). With RFC 8707 enabled, `resource` → token `aud`.
    - Examples:
      - IdP Admin routes: audience `https://idp.ocg.labs.empowernow.ai/api/admin`, scopes `[admin.api]`.
      - CRUD routes: audience `https://crud.ocg.labs.empowernow.ai/api`, scopes `[api.read]` or `[api.read, api.write]`.
    - Attached only to upstream requests; never to the browser. Cached with short TTL.
  - on_behalf_of (Token Exchange)
    - Optional for user‑bound flows. Exchanges session token for a constrained upstream token with specific audience/scopes.

- Why CRUD 401s happened and fix
  - The login token’s audience was generic, so `crud-service` rejected it.
  - Adding `token_policy: { mode: service_token, service: crud_service, audience: https://crud.../api, scopes: [api.read] }` makes BFF attach a proper CC token; upstream accepts it.

- Where this is configured
  - Per‑route policies in `ServiceConfigs/BFF/config/routes.yaml` under each CRUD/IDP Admin route.
  - IdP client (`bff-server`) in `ServiceConfigs/IdP/config/clients.yaml` enables `client_credentials` + `private_key_jwt` and publishes the PKJWT key (kid `bff-sig-001`).

### routes.yaml schema changes
- Add token_policy node to any route.
- Backwards compatible: token_policy omitted → current behavior.

Example (admin API using service token):
```yaml
- id: idp-admin
  path: /api/idp/admin/*
  target_service: idp_service
  upstream_path: /api/admin/{path}
  methods: [GET, POST, PUT, DELETE, OPTIONS]
  auth: session
  token_policy:
    mode: service_token                  # session_passthrough | service_token | on_behalf_of
    service: idp_admin                   # key in service registry
    audience: https://idp.../api/admin   # optional override; default from registry
    scopes: [admin.api]                  # optional override; default from registry
    cache_ttl: 300                       # optional: TokenManager hint
```

Example (v1 user API using OBO):
```yaml
- id: idp-user-v1
  path: /api/idp/v1/*
  target_service: idp_service
  upstream_path: /api/v1/{path}
  methods: [GET, POST, PUT, DELETE, OPTIONS]
  auth: session
  token_policy:
    mode: on_behalf_of
    service: idp_user
    audience: https://idp.../api/v1
    scopes: [user:read]                  # minimal set required by upstream
    cache_ttl: 300
```

### BFF Service Registry (authoritative per‑service defaults)
- Source: ms_bff/src/core/settings.py (or mounted config/settings.yaml).
- ServiceConfig:
  - base_url, token_url
  - client_id, client_secret (or private_key_jwt/mTLS material)
  - token_audience, required_scopes
  - cache_ttl
- Keys: crud_service, pdp_service, workflow_service, idp_admin, idp_user, etc.

### TokenManager changes
Add two public methods (async):
- get_service_token_cc(session_id: str | None, service_key: str, overrides?: {audience?, scopes?, cache_ttl?}) -> str
  - Mint client_credentials token using registry defaults and global cache.
  - Global cache key: `bff:svc:token:cc:{service}:{aud_hash}:{scope_hash}`; early refresh window 60s.
  - Tokens stored only server-side (Redis). No browser exposure.
- get_obo_token(session_id: str, service_key: str, overrides?) -> str
  - Validate session; extract user access token.
  - Perform RFC 8693 Token Exchange against IdP with audience/scopes.
  - Per-session cache key: `bff:obo:{session_id}:{service}:{aud_hash}:{scope_hash}`; early refresh window 60s.
  - Singleflight per cache key to avoid stampedes.

Internal details:
- Credential sources:
  - client_secret via Docker secrets/env; private_key_jwt keystore; mTLS cert+key.
  - PATs for upstreams that require them (e.g., vendor APIs): load from Vault or Docker secret; reference via env/secret path; never in repo or browser.
  - Never load end‑user passwords; avoid ROPC.
- Audience/scopes:
  - overrides from route token_policy, fallback to service registry.
- Storage:
  - Redis hash per session for OBO; Redis global namespace for service tokens.
  - Values: {access_token, expires_at, scopes, audience, token_type, client_id, grant_type}.
- Expiry handling:
  - Consider early refresh window (e.g., 60s) to avoid edge expiry.
- Concurrency:
  - Single-flight (per cache key) using asyncio locks to avoid stampede.
- Metrics:
  - bff_tokens_minted_total{mode="cc|obo",service}; bff_tokens_cache_hit_total{mode,service}
  - bff_token_mint_latency_seconds{mode,service}
  - bff_proxy_upstream_auth_failed_total{mode,service,reason}
- Audit:
  - Structured logs for issuance (no tokens), correlation_id, service, mode, audience, scopes_count.

### Dynamic Router changes
- Extend RouteConfig schema to include token_policy (pydantic with enums and validation).
- On request:
  - Read token_policy.
  - Set extra_headers['X-Token-Policy'] = compact JSON summary (mode, service, audience, scopes) for proxy debugging.
  - If omitted → legacy path (session_passthrough).

### Proxy changes
- Before forwarding:
  - Determine token mode:
    - session_passthrough: current behavior.
    - service_token:
      - token = TokenManager.get_service_token(session_id=None or session_id for per-tenant hints, service, overrides).
    - on_behalf_of:
      - If `BFF_OBO_ENABLED` is false → 501 `on_behalf_of_not_enabled`.
      - Else token = TokenManager.get_obo_token(session_id, service, overrides).
  - Set Authorization: Bearer <token>.
- Fallbacks:
  - If token issuance fails → return 502 with structured error; never silently downgrade to session token when policy says service/OBO.
- Observability:
  - Log route_id, mode, service, audience, scopes_len, cache_hit.

Security hardening:
- Audience allow-list: reject policy.audience hosts not in `settings.bff.allowed_aud_hosts` with 400 `invalid_audience`.
- Never allow extra_headers to set/override `Authorization` (applies to streaming proxy too).

### IdP alignment
- Audience mappings in IdP config remain as-is; they act at issuance time only.
- Clients:
  - Register BFF service clients needed for admin/user audiences (e.g., bff-server or dedicated).
  - Ensure scopes (admin.api, user:*) are allowed and map to required audiences.
- OBO support:
  - If using OAuth 2.0 Token Exchange, enable it at the IdP and register resource servers.
  - Alternatively, use token exchange via custom endpoint with PDP check if IdP lacks native TE.

### Security
- Cred storage: Docker secrets or Vault; inject paths via env; read once on startup.
  - PATs are allowed and supported as first‑class credentials, managed like any other secret (Vault/Docker secret). No changes to the per‑route policy model are required.
- Key management:
  - If private_key_jwt: JWKS published by BFF; rotate keys (90 days) with overlapping kids.
  - mTLS only for trusted internal flows.
- No token data in logs; only presence and metadata.
- CSP: unchanged; cookies remain httpOnly and sameSite=None for session only.

### Error handling
- 401 from IdP on admin/v1 endpoints:
  - Verify forwarded token’s aud contains admin/v1.
  - Retry once if token near expiry and cache miss.
- 502 upstream_auth_failed:
  - Surface structured details: {mode, service, audience, scope_count, reason}.

### Backward compatibility / rollout
- Phase 1: Implement token_policy schema; default to session_passthrough.
- Phase 2: Enable on admin routes with service_token; validate success.
- Phase 3: Optional OBO for specific v1 endpoints needing user-bound tokens.
- Feature flags:
  - BFF_TOKEN_POLICY_ENABLED=true
  - BFF_OBO_ENABLED=false (enable to turn on OBO acquisition)

### Settings additions
- Service registry (`service_settings.yaml`) per-service defaults:
  - `cache_ttl` for token caching hints.
  - Minimal `required_scopes` (e.g., `pdp_service: ["api.read"]`, `idp_user: ["user:read"]`).
- BFF settings (`settings.yaml`):
  - `bff.allowed_aud_hosts`: ["idp.ocg.labs.empowernow.ai","crud.ocg.labs.empowernow.ai","authz.ocg.labs.empowernow.ai"]
  - `cache.redis_url` should not be localhost in containers (use service DNS).

### Test plan
- Unit:
  - Route parsing/validation; audience allow-list validation; header guards.
  - TokenManager cc/obo cache correctness; singleflight; early refresh behavior.
- Integration:
  - End-to-end with IdP (client_credentials and token exchange).
  - Validate Authorization header carries admin/v1 or v1 aud as configured.
- Security tests:
  - Keys absence in logs.
  - Deny on issuance failure.
- Load:
  - Token cache hit ratio; singleflight under 20–100 concurrent requests per key.

### Example developer pseudocode
RouteConfig (pydantic):
```python
class TokenPolicy(BaseModel):
  mode: Literal["session_passthrough","service_token","on_behalf_of"]
  service: str | None = None
  audience: HttpUrl | None = None
  scopes: list[str] = []
  cache_ttl: int | None = None
```

Dynamic router:
```python
policy = route_config.token_policy
extra_headers = {"X-Route-ID": route_config.id}
if policy:
  extra_headers["X-Token-Policy"] = json.dumps({"m":policy.mode,"s":policy.service})
response = await proxy_bff_request(request, upstream_path, upstream_base=svc.base_url, extra_headers=extra_headers)
```

Proxy (core):
```python
policy = parse_token_policy_from_headers(request)
if policy and policy.mode != "session_passthrough":
  tm = request.app.state.token_manager
  if policy.mode == "service_token":
    token = await tm.get_service_token(session_id=None, service_key=policy.service or infer, overrides=policy)
  else: # OBO
    token = await tm.get_obo_token(session_id=session_id, service_key=policy.service or infer, overrides=policy)
  headers["Authorization"] = f"Bearer {token}"
else:
  headers["Authorization"] = f"Bearer {session_access_token}"
```

### Ops
- Dashboards: token mint success rate, cache hits, latency, 401/403 counts per route.
- Alerts: spike in issuance failures; cache miss spikes; 401 on admin route > threshold.

### Operations – New Model (one token per resource server)
- What changed
  - UI login still uses a generic session token (kept server-side).
  - Each protected route now declares a `token_policy`; the BFF mints a backend token whose `aud` matches the target service and attaches only that token upstream.

- Client management (IdP)
  - Primary client: `bff-server` (confidential, `private_key_jwt`, grants: `authorization_code`, `client_credentials`).
  - Keys: PKJWT kid `bff-sig-001` (rotate via JWKS). No per-upstream clients required.
  - RFC 8707: enabled in IdP; BFF sends `resource=<audience>` per route so `aud` in tokens is precise.

- Per‑route knobs (BFF routes.yaml)
  - `token_policy.mode`: `service_token` (CC) or `on_behalf_of` (TE) or omit for session passthrough.
  - `service`: logical service key (e.g., `idp_admin`, `crud_service`).
  - `audience`: canonical audience (e.g., `https://idp.../api/admin`, `https://crud.../api`).
  - `scopes`: least‑privilege list (e.g., `admin.api`, `api.read`).
  - `cache_ttl`: hint for TokenManager.

- Environment knobs
  - IdP: `FEATURE_FLAGS__ENABLE_RFC8707=true`; `TOKEN__ADMIN_AUDIENCE` set to canonical admin aud.
  - BFF: PDP settings for CC mint (PKJWT key path/kid); `BFF_TOKEN_POLICY_ENABLED=true`.

- Ops workflow
  1) Add/adjust a route’s `token_policy` with correct `audience` and `scopes`.
  2) Ensure upstream accepts that audience/scope.
  3) Deploy; verify logs: `bff_idp_cc_success`, upstream 2xx.

- Troubleshooting
  - 401 from upstream: missing `token_policy`, wrong `audience`, or insufficient `scopes`.
  - 401 from IdP during CC: PKJWT key mismatch or wrong client auth method.
  - PDP denies: adjust `authz_map` or policies; not a token issue.

### Deliverables
- Code: RouteConfig changes; TokenManager modes; proxy integration; service registry updates.
- Config: routes.yaml annotated with token_policy on admin/v1 routes.
- Docs: Developer guide (config schema), runbook (troubleshooting 401/502), security notes.
- Migration: Add token_policy incrementally, no break to existing routes.

This approach gives you principle-of-least-privilege tokens per route, hides credentials, avoids growing browser tokens, and makes audience/scope compliance deterministic for upstreams like IdP admin APIs.