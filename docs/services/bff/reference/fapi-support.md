---
title: FAPI 2.0 Features — Verified Support and Configuration
---

Scope

- This page lists only features present in our code/config today and how to enable them. No claims beyond what we can verify.

Verified capabilities

- PKCE: Used in the OAuth code flow; `code_verifier` is persisted and retrieved during token exchange (see `src/api/v1/endpoints/auth.py`, `IdPClient.exchange_authorization_code`).
- PAR (Pushed Authorization Requests): Supported in the auth implementation with feature flag; see `ms_bff/src/routes/auth_stub.py` (`MS_BFF_PAR_ENABLED`) and design doc indicating current implementation.
- DPoP (sender‑constrained tokens):
  - Client side: token requests include DPoP header when enabled; see `IdPClient` using the enterprise OAuth client and DPoP manager.
  - Server side: `DPoPValidationMiddleware` is added when Redis is available; see `src/main.py` and DPoP metrics in `src/metrics/__init__.py`.
- Client authentication methods: Configurable via `MS_BFF_TOKEN_AUTH_METHOD` with support for `client_secret_basic` and `private_key_jwt` (see `src/services/idp_client.py` and `routes/auth_stub.py`).
- mTLS token binding (enterprise client): If enabled in the enterprise OAuth config, `IdPClient` will pass client cert/key to httpx and mark token binding method as `mtls`.

Not implemented (no code present in this repo)

- JAR (signed request objects) and JARM (signed authorization response). No request-object signing/verification is present in the public code; keep as future.

Enablement and configuration

- Environment variables
  - `MS_BFF_PAR_ENABLED`: "true" to enable PAR path in auth implementation
  - `MS_BFF_DPOP_ENABLED`: "true" to enable DPoP usage in auth implementation
  - `MS_BFF_TOKEN_AUTH_METHOD`: `client_secret_basic` or `private_key_jwt`
  - `OIDC_ISSUER`, `OIDC_TOKEN_URL`, `OIDC_AUTHORIZATION_URL`: IdP endpoints (HTTPS in production; internal HTTP allowed for container comms as coded)
  - For mTLS (enterprise OAuth): provide cert/key via the enterprise SDK config so `IdPClient` detects `is_mtls_enabled()`

Operational notes

- DPoP middleware requires Redis. When Redis is unavailable, middleware is skipped and a warning is logged (see `create_app()` in `src/main.py`).
- Metrics: DPoP validation failures and PAR request counters are exposed via Prometheus metrics in `src/metrics/__init__.py`.
- Frontends: SPAs do not handle DPoP; all PoP and OAuth mechanics are server‑side in the BFF.

Security profiles (practical view)

- FAPI 2.0 Baseline‑aligned: PKCE + PAR + sender‑constrained tokens (DPoP) with proper server‑side authorization.
- FAPI 2.0 Advanced path: mTLS and/or DPoP are the sender‑constraining options; mTLS can be enabled via enterprise OAuth config, DPoP is already integrated. JAR/JARM not present.

Dependencies

- Production IdP operations rely on `empowernow_common.oauth.HardenedOAuth` (enterprise SDK). The BFF fails fast if unavailable (see `src/services/idp_client.py`).


