## IdP support, authentication, and authorization

### IdP support and configuration
- Yes, we support any standards-compliant IdP that issues JWTs with a JWKS endpoint (e.g., Azure AD, Auth0, Keycloak, Entra ID, Okta).
- Configure the Cloud Hub with:
  - Env: `NOWCONNECT_JWKS_URL`, `NOWCONNECT_AUDIENCE`
  - Or YAML (`ServiceConfigs/NowConnect/config/cloud.yaml`): `security.jwks_url`, `security.audience`
- The Cloud validates Bearer tokens on WebSocket upgrade using JWKS and `aud`, and requires `agent_id` in claims. `HELLO.agent_id` must match the claim. See `nowconnect_cloud/auth.py` and `nowconnect_cloud/settings.py`.

### FAPI 2.0 (DPoP, mTLS)
- Not implemented today:
  - DPoP-bound access tokens: no
  - OAuth mTLS-bound tokens / client cert verification in app: no
- Workarounds/near-term options:
  - Terminate TLS at your ingress with client mTLS and only forward requests that pass mTLS; the app will still do JWT validation. App-level client-cert validation would be a small extension if required.

### What security features are currently supported
- WebSocket upgrade authentication:
  - Bearer JWT validated against IdP JWKS and audience; `agent_id` claim required.
- Network controls:
  - TCP listeners explicitly configured; optional source IP allowlist (`security.allow_cidrs`).
- Transport:
  - `wss://` tunnel; agent supports corporate proxies (`NC_TRUST_ENV=true`) and system CA trust.
  - Protocol payloads are raw TCP; if the app protocol is TLS (LDAPS/HTTPS/etc.), TLS is end-to-end.
- Secrets:
  - Agent reads token from file (`NC_TOKEN_FILE`); mount as read-only Secret/volume; restart to rotate.
- Observability:
  - Structured logs (JSON on cloud by default; agent supports `NC_LOG_FORMAT=json`).
  - Prometheus metrics on cloud; health endpoints on both sides (agent TCP health, cloud `/healthz`/`/readyz`).
- Safety:
  - Bounded per-connection queues, idle sweeper, FIN/RST handling.

### OpenID AuthZEN PDP (authorization)
- Not integrated yet in the tunnel control plane. Current behavior:
  - On `HELLO`, agent registers its `connectors`; Cloud does not enforce per-connector authorization against token claims or PDP.
- How to add (recommended pattern):
  - Enforce connector scopes in the JWT (behind `NOWCONNECT_REQUIRE_CONNECTOR_SCOPES`) and reconcile in `nowconnect_cloud/hub.py` on `HELLO`.
  - On each `OPEN(connector)`, call your PDP to authorize `subject=agent_id`, `action=connect`, `resource={type:"connector", id:<name>}`. Deny fast on policy failure.
  - Cache allow decisions briefly to limit PDP load.

#### PDP request/response schema (example)

```json
{
  "subject": { "agent_id": "agent-foo-01" },
  "action": "connect",
  "resource": { "type": "connector", "id": "ldap" },
  "context": { "replica_id": "hub-a", "aud": "nowconnect" }
}
```

```json
{ "allow": true, "ttl_sec": 5 }
```

Failure/timeout behavior (recommended): default deny on explicit deny; default deny on PDP timeout unless `pdp.fail_open=true` is explicitly set for non-critical environments.

### Summary answers
- **IdP**: Yes, any OIDC/OAuth2 IdP with JWKS and JWTs; configure via `NOWCONNECT_JWKS_URL`/`NOWCONNECT_AUDIENCE` or YAML security settings.
- **FAPI 2.0 DPoP/mTLS**: Not today; feasible to add. mTLS can be enforced at ingress immediately.
- **Other security**: JWT on WS upgrade, CIDR allowlist, structured logging, metrics, health, proxy/CA support, secret handling via files/secrets.
- **Authzen PDP**: Not currently; recommended integration points identified and can be implemented quickly if required.

