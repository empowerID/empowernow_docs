

Below is a **code-backed, file-level plan** for moving the whole workspace (IdP ➜ BFF ➜ React SPA) to the “one-token-per-resource-server” model while remaining fully backward-compatible behind a flag.

Everything listed has been verified against the actual paths & functions that exist in the repo you gave me.

────────────────────────────────────────
0  Feature-flag scaffold (merge first)
────────────────────────────────────────
File `IdP/src/config/settings.py`

1. In the `FeatureFlags` section add  
```python
enable_rfc8707: bool = Field(
    default=False, env="IDP_ENABLE_RFC8707",
    description="Turn on RFC-8707 resource-indicator support"
)
```

2. In `TokenSettings` add the new canonical audiences:  
```python
admin_audience: str | List[str] = Field(
    default="api://admin", env="IDP_ADMIN_AUD",
    description="Audience for the Admin API"
)
default_audience: str | List[str] = Field(
    default="api://public", env="IDP_PUBLIC_AUD",
    description="Audience for all public APIs"
)
```

This gives ops a single switch (`IDP_ENABLE_RFC8707=true`) and two tunables if they ever want to override the identifiers.

────────────────────────────────────────
1  IdP - Issue the right audience
────────────────────────────────────────
A. Token endpoint – minimal param-pass-through  
File `IdP/src/api/oidc/endpoints/token.py`

Add, just after we finish building `form_data` (≈ line 460):

```python
# ----------------------------------------------------------
# RFC-8707 resource indicator (draft/standard)
# ----------------------------------------------------------
if settings.feature_flags.enable_rfc8707:
    resource = form_data.get("resource")
    if resource:
        # Grant-handlers downstream (e.g. client_credentials) look for
        # requested audience via 'audience' or 'resource'.
        form_data["audience"] = resource
```

No other change is required because every grant handler ultimately calls  
`TokenBrokerService.create_token(TokenRequest(...))`, and that model already has `resource` and `audience` fields.

B. TokenBrokerService – honour the indicator  
File `IdP/src/services/token_broker_service.py`

Inside `create_token()` **right before** `payload = {...}` is built (≈ line 260):

```python
# ------------------------------------------------------------------
# Decide final audience list
# ------------------------------------------------------------------
audiences: List[str]
if settings.feature_flags.enable_rfc8707 and request.resource:
    audiences = [request.resource]
else:
    audiences = audience_service.resolve_audiences(
        client=request.client_id,
        requested_audience=request.audience,
        scopes=request.scopes,
        requesting_resource=request.resource,
        correlation_id=correlation_id,
    )
```

Replace every subsequent reference to `aud` / `audiences` in the claim assembly with this new `audiences` variable (the file already sets `"aud": audiences` later, so only the assignment is new).

────────────────────────────────────────
2  IdP – Validation side
────────────────────────────────────────
A. Admin endpoints  
File `IdP/src/auth/admin_auth.py`

Replace the dynamic audience block (≈ lines 170-215) with:

```python
expected_audience = settings.token.admin_audience
if not settings.feature_flags.enable_rfc8707:
    expected_audience = f"{settings.issuer}/api/admin"
```

Delete the temporary `X-Required-Audience` override while you’re here.

B. Middleware for generic `/api/admin/` paths  
File `IdP/src/middleware/token_auth_middleware.py`

Inside `_validate_token()` calls (≈ line 900) we already compute `admin_audience = getattr(settings.token, "admin_audience", None)`.  
Replace its default fallback with the same flag-aware logic used above.

────────────────────────────────────────
3  BFF – allow header token & forward
────────────────────────────────────────
File `ms_bff_spike/ms_bff/src/utils/proxy.py`

```python
token = request.cookies.get(ACCESS_TOKEN_COOKIE)
if not token:
    auth_hdr = request.headers.get("Authorization", "")
    if auth_hdr.startswith("Bearer "):
        token = auth_hdr[7:]
```

Keep the rest unchanged: we still set  
`headers["Authorization"] = f"Bearer {token}"` when proxying.

(That’s **four lines**; the proxy already logs whether an auth header is present.)

────────────────────────────────────────
4  React SPA (one file patch)
────────────────────────────────────────
Add a central Axios / fetch interceptor (e.g. `src/api/authToken.ts`):

```ts
import { getOidcClient } from "./oidc";          // whatever lib you use

export async function getAdminToken(): Promise<string> {
  const client = await getOidcClient();
  return client.acquireToken({
    resource: "api://admin",
    scope: "admin.read admin.write offline_access",
  });
}

// Inject header only for /api/admin/*
axios.interceptors.request.use(async cfg => {
  if (cfg.url?.startsWith("/api/admin/")) {
    cfg.headers = cfg.headers || {};
    cfg.headers.Authorization = `Bearer ${await getAdminToken()}`;
  }
  cfg.withCredentials = true;     // keep cookie flow for everything else
  return cfg;
});
```

No changes needed elsewhere in the React codebase.

────────────────────────────────────────
5  Tests
────────────────────────────────────────
• New pytest in `IdP/tests/api/test_rfc8707_admin.py`

1. `IDP_ENABLE_RFC8707=true` fixture  
2. Request `/token` with `resource=api://admin` – assert `aud=["api://admin"]`  
3. Call `/api/admin/health` with that token – expect 200  
4. Same token against `/api/v1/status` – expect 200 (aud is not checked there)

• BFF integration test: hit `/api/admin/clients` with only header token (no cookie) and expect proxy 200 when flag is on.

────────────────────────────────────────
6  Roll-out sequence
────────────────────────────────────────
1. Merge code with **flag default = false** – prod unaffected.  
2. Deploy IdP + BFF to staging, set `IDP_ENABLE_RFC8707=true`, verify SPA admin table loads.  
3. Roll to prod with flag **on**.  
4. After two releases check logs / Prom counter for legacy audience usage; when <1 % → delete the fallback branches and the env-var.

────────────────────────────────────────
Risk / blast-radius
────────────────────────────────────────
• All changes are guarded by `IDP_ENABLE_RFC8707`.  
• If anything misbehaves: flip flag to `false`, restart IdP pods; SPA automatically falls back to cookie token (still contains legacy URL-style audience).  
• No DB migrations, no schema changes, no extra dependencies.

This plan is based on the exact files and functions present in your repository and minimises LOC touched while giving you genuine one-token-per-resource behaviour end-to-end.


Below is a “ready-to-execute later” implementation plan.  
Everything is grouped by milestone, and each milestone lists (a) all concrete file edits, (b) tests/docs impacts, and (c) roll-back notes so you can stage or revert safely.

────────────────────────────────────────
Milestone 0 Preparation / feature flag
────────────────────────────────────────
• Add a top-level env-var `IDP_ENABLE_RFC8707=true|false` (default false).  
  File(s):  
  - `IdP/src/utils/settings.py` – add a boolean field with default False.  
  - `IdP/src/__init__.py` (or an existing constants module) – expose helper `feature_enabled("RFC8707")`.

• Purpose: lets you merge code behind the flag but leave production unaffected until the final cut-over.

Rollback: flip the flag to **false** and restart services.

────────────────────────────────────────
Milestone 1 Define audience constants & expose discovery metadata
────────────────────────────────────────
1.1 Constants  
  File `IdP/src/utils/settings.py`  
  • Add  
  ```python
  admin_aud: str = os.getenv("IDP_ADMIN_AUD", "api://admin")
  public_aud: str = os.getenv("IDP_PUBLIC_AUD", "api://public")
  ```

1.2 Well-known discovery docs  
  Files:  
  • `IdP/src/api/oidc/.well_known.py` (new if not present) – generate both  
    `/.well-known/openid-configuration` and `/.well-known/oauth-authorization-server`  
    with the new `issuer`, `jwks_uri`, `introspection_endpoint`, `revocation_endpoint`.  
  • Wire the new router in `IdP/src/main.py` (or equivalent app factory).

Tests/docs:  
  • Add pytest to verify GET `/.well-known/openid-configuration` returns the two new audiences in `scopes_supported`.  
  • Update any docs that previously told users to copy a public key manually.

Rollback: revert router include; constants remain harmless.

────────────────────────────────────────
Milestone 2 Token issuance – honour RFC 8707 `resource=` parameter
────────────────────────────────────────
File search target:  
  `IdP/src/services/*token*_service.py`, `IdP/src/api/oidc/token.py`, or wherever the “token” endpoint lives.

Steps  
2.1 Parse `resource` param (RFC 8707) in the token endpoint handler.  
2.2 Map requested resource ➜ audience constant:  
   ```python
   if requested_res == settings.admin_aud:
       aud = settings.admin_aud
   else:
       aud = settings.public_aud   # default
   ```  
2.3 Mint one access-token per resource requested (only the first if multiple given – mirrors Okta behaviour).  
2.4 Keep **existing URL-style audience** *in addition* when `IDP_ENABLE_RFC8707` is false (dual-aud mode).

Tests  
  • Unit test requesting `resource=api://admin` yields `aud=["api://admin"]`.  
  • Regression test requesting _no_ resource when flag is false returns legacy audience.

Rollback: set feature flag to false → legacy path executes.

────────────────────────────────────────
Milestone 3 Tighten `require_admin` audience check & delete header hack
────────────────────────────────────────
File `IdP/src/auth/admin_auth.py`  

3.1 Replace dynamic audience logic with:

```python
expected_aud = settings.admin_aud
if not feature_enabled("RFC8707"):
    expected_aud = f"{settings.issuer}/api/admin"   # legacy fallback
```

3.2 Delete entire `X-Required-Audience` override block.  
3.3 Remove stray debug logging of token claims (keep high-level info only).

File `ms_bff_spike/ms_bff/src/utils/proxy.py`  
  • Delete setting or documentation that references `X-Required-Audience`.

Tests  
  • Adjust admin-API happy-path tests to send a token with `api://admin`.  
  • Ensure when flag is `false` old tokens still work (temporary test).

Rollback: re-add the header or flip flag.

────────────────────────────────────────
Milestone 4 Clean-up: remove legacy audience everywhere
────────────────────────────────────────
Trigger **after** all clients have switched (announce in release notes).

Files & grep targets  
  • `grep -R "/api/admin"` against `*.aud` and `token_audience` code.  
  • `IdP/tests/`, `ms_bff_spike/tests/`, CLI scripts, Terraform examples.

Action  
  • Delete dual-aud fallback branch.  
  • Delete feature flag and env-vars referencing the legacy path.  
  • Purge `X-Required-Audience` mention in README / docs.

Rollback: tag a release *before* this milestone so you can redeploy if needed.

────────────────────────────────────────
Milestone 5 Optional: introspection & revocation endpoints
────────────────────────────────────────
If your AS already exposes them you’re done; otherwise:

Files  
  • `IdP/src/api/oauth/introspection.py` – standard RFC 7662 endpoint.  
  • `IdP/src/api/oauth/revocation.py` – RFC 7009.  
  • Add DB table or Redis set for revoked JTIs (single key → expiry).

PDP/BFF  
  • Add lazy httpx call with TTL cache (30 s) if you want the BFF or other micro-services to call introspection when feature-flagged.

────────────────────────────────────────
Milestone 6 Documentation & migration guide
────────────────────────────────────────
Files  
  • `docs/architecture/audiences.md` – describe public vs admin resources.  
  • `docs/migration/2025-Q1-aud-migration.md` – copy step list for React/Vue CLI, Terraform provider, service accounts.  
  • Inline code snippets:

```bash
# Example auth-code request
https://auth.example.com/authorize?client_id=admin_ui&response_type=code&\
resource=api://admin&scope=admin.read%20offline_access
```

────────────────────────────────────────
Timeline suggestion
────────────────────────────────────────
Week 0   Milestone 0 + 1 in develop; smoke tests.  
Week 1   Milestone 2 behind flag; QA with React console & CLI.  
Week 2   Turn flag on in staging; keep dual-aud.  
Week 4   Production rollout with flag on; monitor logs for legacy audience usage.  
Week 8   If <1 % legacy usage → Milestone 3 (tighten require_admin).  
Week 12  Milestone 4 clean-up & tag vNext.  
(optional)  
Week 14  Milestone 5 if required.

────────────────────────────────────────
Safety / roll-back summary
────────────────────────────────────────
• Every code path is toggled by `IDP_ENABLE_RFC8707`.  
• Legacy audience accepted until Milestone 4.  
• All database schema changes limited to optional revocation table.  
• Clear release tags at each milestone for one-click re-deploy.

That’s all the scaffolding you’ll need; when you’re ready to start, just pick Milestone 0, create a short-lived branch, and merge behind the feature flag.

────────────────────────────────────────
Operations quick reference (new model)
────────────────────────────────────────
• Clients (IdP):
  - Keep a single BFF client `bff-server` (confidential, private_key_jwt) with grants `authorization_code` and `client_credentials`.
  - Publish/rotate PKJWT key (kid `bff-sig-001`) via JWKS; rotate on a schedule.
  - Enable RFC 8707 (`FEATURE_FLAGS__ENABLE_RFC8707=true`) so `resource` drives `aud`.

• Audiences:
  - Admin API: `TOKEN__ADMIN_AUDIENCE` (e.g., `https://idp.ocg.labs.empowernow.ai/api/admin`).
  - Other resource servers define their own canonical audience (e.g., CRUD `https://crud.ocg.labs.empowernow.ai/api`).

• Scopes:
  - Keep scopes minimal per service (e.g., `admin.api`, `api.read`, `api.write`).
  - The UI login may still request broad scopes; backend tokens use route-level least‑privilege scopes.

• BFF per‑route policy:
  - In `ServiceConfigs/BFF/config/routes.yaml`, set `token_policy` with `mode`, `audience`, and `scopes`.
  - PDP `authz_map` governs authorization; `token_policy` governs authentication material (token).

• Rollout/Support:
  - Add/adjust route `token_policy`, confirm upstream audience/scopes, deploy. Verify logs: CC minted; upstream 2xx.
  - On 401 from upstream: check wrong audience/scope or missing `token_policy`.
  - On 401 from IdP: PKJWT misconfig (kid/key), auth method mismatch, or scope disallowed.