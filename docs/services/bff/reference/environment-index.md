---
title: Environment Variables Index
---

Sources

- Docker Compose (`CRUDService/docker-compose-authzen4.yml` bff service)
- K8s manifests (if present)
- `.env` for local development

Highlights

OAuth / IdP

- `OIDC_ISSUER` (URL): OIDC issuer base (public). Example: `https://idp.ocg.../api/oidc`.
- `OIDC_AUTHORIZATION_URL` (URL): Authorization endpoint for code flow.
- `OIDC_TOKEN_URL` (URL): Token endpoint (internal URL allowed in compose).
- `AUTH_CLIENT_ID` (string): OAuth client ID used by the BFF.
- `AUTH_CLIENT_SECRET` (secret): OAuth client secret; rotate via secrets manager.
- `OIDC_SCOPES` (string): Space‑delimited scopes; include `offline_access` for refresh tokens.

PAR / DPoP

- `MS_BFF_PAR_ENABLED` (bool): Enable Pushed Authorization Requests. Default: `true` in compose.
- `MS_BFF_DPOP_ENABLED` (bool): Enable DPoP sender‑constrained tokens. Default: `true` in compose.
- `MS_BFF_TOKEN_AUTH_METHOD` (enum): Client auth at token endpoint: `client_secret_post` | `client_secret_basic` | `private_key_jwt`.

Cookie / Session

- `BFF_COOKIE_DOMAIN` (string): Cookie domain (e.g., `.ocg.labs.empowernow.ai`) for SSO across SPAs.
- `BFF_COOKIE_SECURE` (bool): Send cookies only over HTTPS. Default: `true`.
- `BFF_COOKIE_SAMESITE` (enum): `Lax` | `Strict` | `None`. Default: `Lax`.
- `SESSION_LIFETIME` (seconds): Session TTL. Example: `3600`.

Callback / Redirects

- `BFF_DYNAMIC_CALLBACK` (bool): Use incoming origin for callback when same‑origin. Default: `true`.
- `BFF_CALLBACK_URL` (URL): Static fallback callback URL.
- `BFF_DEFAULT_HOST`, `BFF_DEFAULT_SCHEME` (string): Default host/scheme used in redirects.
- `BFF_ALLOWED_REDIRECT_HOSTS` (CSV): Allowed redirect hosts to prevent open redirects.
- `ALLOWED_REDIRECT_ORIGINS`, `ALLOWED_FRONTEND_ORIGINS` (CSV): Additional allowlists.

CORS

- `CORS__ALLOW_ORIGINS` (JSON array): List of allowed origins for CORS responses.

Keys / JWKS

- `BFF_JWT_SIGNING_KEY` (path): Path to PEM private key for private_key_jwt.
- `KEYS_DIR`, `BFF_KEYS_DIR` (path): Directory where PEM and JWKS are stored/served.

Security toggles

- `BFF_JWT_VERIFY_SIGNATURE` (bool): Verify JWT signatures where applicable.
- `BFF_JWT_VERIFY_AUDIENCE` (bool): Enforce `aud` checks.
- `BFF_JWT_VERIFY_ISSUER` (bool): Enforce `iss` checks.
- `BFF_JWT_VERIFY_EXPIRY` (bool): Enforce `exp` checks.
- `BFF_REDIS_ENCRYPT_SECRETS` (bool): Encrypt sensitive values before Redis storage.
- `BFF_TOKEN_MANAGER_CONCURRENCY_SAFE` (bool): Enable stricter singleflight/concurrency guards.

Secrets / Salts

- `TOKEN_HASH_SALT` (secret or file pointer): Required at startup; used for hashing tokens.
- `UA_HASH_SALT` (secret or file pointer): Hashing salt for user‑agent analytics.
- `CSRF_SECRET_KEY` (secret): HMAC key for CSRF tokens.
- `STATE_TOKEN_KEY` (secret): HMAC key for login state tokens.

Service discovery / URLs

- `BFF_BASE_URL` (URL): External base URL for the BFF.
- `IDP_PUBLIC_BASE` (URL): Public base URL for IdP.
- `REDIS_URL` (URL): Redis connection string.

Observability

- `TELEMETRY_ENABLED` (bool): Enable OTEL tracing/metrics if libraries present.
- `OTLP_ENDPOINT` or `OTEL_EXPORTER_OTLP_ENDPOINT` (URL): OTLP collector endpoint.

Kafka

- `KAFKA_*`: See service configs; BFF reads bootstrap servers and topic overrides.

Values syntax

- Booleans: `"true" | "false"` (strings in compose). Numbers as plain integers.
- CSV: comma‑separated list without spaces unless quoted.
- JSON arrays: valid JSON string (e.g., `'["https://a","https://b"]'`).

See also

- How‑to → Configure IdPs, Configure PDP, OpenTelemetry, Secret Rotation
- Reference → Settings Reference, Observability (Metrics, Tracing, Health)
- How‑to → Upstream TLS/mTLS to CRUD: ../how-to/enable-upstream-tls-to-crud.md


