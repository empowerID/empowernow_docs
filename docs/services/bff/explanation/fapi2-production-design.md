---
id: fapi2-production-design
title: BFF — FAPI 2.0 Production Design and Delivery Plan
sidebar_label: FAPI 2.0 design & plan
tags: [service:bff, type:explanation, security]
---

## Summary

Goal: make the BFF a production‑grade FAPI 2.0 client gateway for SPAs and services. Today we support PKCE, PAR, DPoP, `private_key_jwt`, and mTLS paths; this design adds JAR and JARM in the BFF and defines conformance, rollout, and ops.

Target profiles: Phase 1 — FAPI 2.0 Baseline; Phase 2 — Advanced (where applicable).

Non‑goals: turning the BFF into an authorization server; replacing the IdP; changing SPA contracts (SPAs still call same‑origin `/api/**`).

Assumptions: our IdP already supports PAR, JAR, and JARM; `empowernow_common.oauth` provides JAR/JARM helpers, with JWE decryption to be completed for encrypted JARM.

## Compliance matrix (profile → control)

| Requirement | Baseline | Advanced | Our control |
| --- | --- | --- | --- |
| PKCE S256 | Required | Required | Enforced; verifier 43–128, S256 only |
| PAR | Recommended/Required | Required | PAR‑first; `request_uri` redirect |
| JAR | Recommended | Required | BFF signs `request` (or pushes signed) |
| JARM | Optional | Recommended/Required | BFF verifies `response_mode=jwt` |
| Sender constraint | One of DPoP/mTLS | Often mTLS | Configurable (DPoP or mTLS) |
| Client auth | `private_key_jwt` or mTLS | mTLS or `private_key_jwt` | Unified helper selects per env |
| Discovery metadata | Required | Required | Startup capability check |
| Error redaction | Required | Required | Structured logs; secrets redacted |

## Requirements (FAPI 2.0 – practical mapping)

- Authorization request hardening
  - PKCE (S256), `state`/`nonce`, redirect URI binding
  - PAR required (request_uri) – already present
  - JAR (signed request objects) – add in BFF
- Authorization response hardening
  - JARM (`response_mode=jwt` variants) – add in BFF; verify/decrypt
- Token endpoint
  - Sender constraint: mTLS and/or DPoP (present)
  - Client auth: `private_key_jwt` (present) and/or mTLS
- Discovery/registration
  - Advertise/declare JAR/JARM capabilities in DCR payloads and client metadata
- Crypto/compliance
  - FIPS paths (runtime checks documented in FIPS startup guard)

## Design

### 1) JAR in the BFF (request objects)

- In `/auth/login` flow, build a signed JWT request object using `empowernow_common.oauth.jar`:
  - Payload includes `client_id, redirect_uri, scope, response_type, response_mode (if JARM), state, nonce, code_challenge(S256), code_challenge_method`.
  - Sign with BFF client key (use `BFF_JWT_SIGNING_KEY`); choose alg from `MS_BFF_JAR_SIGNING_ALG`.
  - Optional encryption (config‑gated) if IdP mandates encrypted JAR.
- Submit via PAR (preferred): push the signed request object, obtain `request_uri`, redirect to IdP `/authorize?client_id=...&request_uri=...`.
- Fallback (config): inline `request=...` if PAR is unavailable.
- Validation/duplication rules: IdP’s claims override URL duplicates; ensure we don’t pass conflicting params when using `request`.

Policy

- Algorithm allowlist per environment: `MS_BFF_JAR_ALGS_ALLOWED=PS256,ES256` (avoid weak/legacy). Reject `alg=none`.
- Duplicate parameters: when using `request`/`request_uri`, omit top‑level duplicates or ensure exact match with the request object; otherwise fail early.
- Encrypted JAR (off by default): if enabled, pin strong `alg/enc` suites; reject unknown `crit` headers.

Config

- `MS_BFF_JAR_ENABLED=true|false`
- `MS_BFF_JAR_SIGNING_ALG=RS256|PS256|ES256` (per IdP policy)
- `BFF_JWT_SIGNING_KEY=/app/keys/bff-sig.pem`
- Optional: `MS_BFF_JAR_ENC_ALG`, `MS_BFF_JAR_ENC_METHOD`, `BFF_JAR_ENC_KEY=/app/keys/jar-enc.pub`

Metrics

- `jar_request_objects_created_total{alg}`
- `jar_request_push_failures_total{reason}`

### 2) JARM in the BFF (response_mode=jwt)

- Request path: set `response_mode` to configured JARM mode (`jwt`, `query.jwt`, `fragment.jwt`, or `form_post.jwt`).
- Callback handler:
  - Detect JARM: presence of JWT in response (mode‑specific param).
  - JOSE header checks: `alg` in allowlist; `kid` present/pinned; `typ` matches JARM if provided (e.g., `oauth-authz-resp+jwt`). Reject `alg=none`, unknown `crit`, unvetted `x5u/jku`.
  - Claims checks: `iss` (equals IdP), `aud == client_id`, `exp/iat` with ≤120s skew, bind `state` to transaction, optional `jti` replay cache (cache until `exp`).
  - Encrypted JARM (optional): decrypt JWE with client key, then verify inner JWS; reject nested/plaintext mismatches.
  - Extract `code`/`error` and continue; structured logging for decisions.

Config

- `MS_BFF_JARM_ENABLED=true|false`
- `MS_BFF_JARM_MODE=jwt|query.jwt|fragment.jwt|form_post.jwt`
- Optional JWE:
  - `MS_BFF_JARM_ENC_ALG=RSA-OAEP-256|ECDH-ES|...`
  - `MS_BFF_JARM_ENC_ENC=A256GCM|A256CBC-HS512|...`
  - `BFF_JARM_PRIV_KEY=/app/keys/bff-jarm-key.pem`

Metrics

- `jarm_responses_verified_total{mode}`
- `jarm_decryption_failures_total{alg}`
- `jarm_validation_failures_total{reason}`
- `jarm_replay_denied_total`
- `jarm_typ_invalid_total`
- `jarm_aud_mismatch_total`

### 3) Token endpoint and sender constraint

- Choose a primary sender‑constraint per client (DPoP or mTLS) and document exclusivity; test token binding end‑to‑end.
- DPoP specifics: verify `typ=dpop+jwt`, `htu/htm`, `jti` uniqueness (short‑lived cache), nonce challenge (401 + `DPoP-Nonce`) with retry.
- Keep `private_key_jwt` as default client‑auth in prod; allow `client_secret_post` only in non‑prod.
- Use the same client‑auth selection helper for token, introspection, and revocation; tag metrics with `{auth_method}`.
- Ensure PKCE S256 enforced always; bind JARM state/nonce to token exchange for audit correlation.

### 4) Client registration (DCR)

- Extend DCR payload for the BFF client to declare:
  - `request_object_signing_alg` (JAR)
  - `require_signed_request_object` (per environment policy)
  - `response_modes_supported` incl. JARM modes
  - `authorization_encryption_alg/enc` if encrypted JARM used
- Ensure rotation/replace flows update client metadata.

### 5) Keys and storage

- Store signing/decryption keys in mounted secrets (`/app/keys`), rotated via SOP.
- JWKS exposure (client) if needed by IdP; or out‑of‑band key distribution.
- FIPS startup guard applies.
- Pre‑rotation: publish new `kid` before switching signer; cache JWKS with TTL and background refresh.

### 6) Backward compatibility

- Default: `MS_BFF_JAR_ENABLED=false`, `MS_BFF_JARM_ENABLED=false` → current PAR+PKCE flow unchanged.
- Feature flags per environment; canary SPAs first.

### 7) Observability/ops

- New Prometheus counters/gauges and structured logs around JAR build, JARM verify/decrypt, failure reasons, and IdP JWKS rotation issues.
- Add gauges for JWKS cache age and background refresh outcomes; metrics: `jwks_refresh_failures_total`.
- Runbooks: key rotation, JWKS fetch failure, decrypt failures, fallback behavior, and kill‑switch flags to disable JAR/JARM quickly.

### 8) Discovery/registration capability checks

- On startup, fetch IdP discovery and validate presence of:
  - `pushed_authorization_request_endpoint`
  - `request_object_signing_alg_values_supported`
  - `response_modes_supported` (including JARM variants)
  - `authorization_signing_alg_values_supported`, optionally `_encryption_*`
- Fail fast if required capabilities are missing for enabled flags (config‑gate in non‑prod).

### 9) PKCE & transaction binding

- Enforce verifier length 43–128; method S256 only.
- Persist and bind `state`, `nonce`, PKCE verifier, and optional JARM `jti` to one transaction/session record.

### 10) Session & cookie hygiene

- Cookies: `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict` as policy); short path scope; rotate session ID at login.
- CSRF: require token for state‑changing BFF APIs, or enforce `SameSite=Strict` + double‑submit.

### 11) JOSE hardening

- Reject `alg=none`, unknown `alg`, unknown `crit`, and untrusted `x5u/jku`.
- JWKS: cache with `{kid}` pinning and background refresh; handle rollover via pre‑fetch.

### 12) Error handling & redaction

- Never log request bodies when using `client_secret_post`.
- Redact tokens/secrets consistently; log correlation IDs and decision points only.

## Delivery Plan

Milestone 0 — Prereqs

- Discovery capability check wired to flags; CI gate reads IdP metadata and fails when required capability is missing for enabled features.
- Generate the compliance matrix artifact per environment.

Milestone 1 — JAR (signed request objects)

- Implement request‑object builder integration in `/auth/login`.
- Add config, metrics, logs, and unit/integration tests.
- Verify with IdP in PAR + JAR mode.
  - Negative test: top‑level params differ from `request` → expect rejection, or ensure we omit duplicates.

Milestone 2 — JARM (signed responses)

- Implement callback parsing, signature verification against IdP JWKS, claim validation.
- Add config/metrics/logs and tests for `jwt`, `query.jwt`, `fragment.jwt`, `form_post.jwt`.
  - Add replay tests (reuse same JARM JWT), clock‑skew tests, and aud/state binding tests.

Milestone 3 — Encrypted JARM (JWE)

- Complete JWE decrypt path in `empowernow_common` (if not already complete) and integrate in BFF.
- Keys management and rotation SOP.
  - Pin `alg/enc`; tests for wrong key/alg; verify inner JWS after decrypt.

Milestone 4 — Conformance & hardening

- Run OpenID FAPI 2.0 conformance tests (Baseline + Advanced where applicable).
- Capture results and publish doc; fix gaps.
- Add rate‑limit/CSP refinements if flagged by tests.

Milestone 5 — Rollout

- Staged enablement via flags per environment and per application.
- Production readiness checklist (keys, DCR metadata, JWKS cache/refresh, dashboards, alerts).
  - SLOs: &lt;0.1% JARM validation failures, zero replays, no increase in token errors; canary + kill switch.

## Test Plan (high‑level)

- Unit tests: JAR builder (claims, algs), JARM processor (sig/claims, mode variants, error cases).
- Integration: end‑to‑end auth with IdP for each JARM mode; PAR + signed request.
- Negative: expired/iat/skew, mismatched `iss/aud`, replayed JWT, invalid `state/nonce`, JWE wrong key.
- Performance: added overhead ≤ few ms; measure callback verification cost.

## Risks and mitigations

- JWE decryption gaps in SDK → start with signed‑only JARM; schedule JWE completion.
- Key management complexity → standardize on vault/secret mounts; rotate via SOP.
- Interop variance across IdPs → provide per‑IdP presets (Okta/Auth0/Ping/Curity).

## References

- IdP JAR/JARM support (authorize/discovery), SDK `oauth/jar.py`, `oauth/jarm.py`.
- BFF FAPI features status: `Reference / FAPI 2.0 Features`.

---

## Appendix A — JARM verifier checklist (pseudocode)

```python
def verify_jarm(jwt_token: str, client_id: str, jwks_cache: JwksCache) -> Claims:
    header = peek_header(jwt_token)
    assert header.alg in ALLOWLIST_ALGS
    assert header.kid and jwks_cache.has_kid(header.kid)
    if header.typ:
        assert header.typ in {"oauth-authz-resp+jwt", "JWT"}

    claims = verify_signature_and_decode(jwt_token, jwks_cache)
    now = now_utc()
    assert claims.iss == IDP_ISSUER
    assert claims.aud == client_id
    assert abs(claims.iat - now) <= 120
    assert claims.exp >= now
    assert claims.state == load_bound_state()

    if claims.jti and replay_cache.contains(claims.jti):
        metrics.jarm_replay_denied_total.inc()
        raise ReplayError()
    replay_cache.store(claims.jti, ttl=claims.exp - now)
    return claims
```

## Appendix B — Unified client‑auth helper (token/introspect/revoke)

```python
def get_client_auth(config: Env) -> ClientAuth:
    method = config.MS_BFF_TOKEN_AUTH_METHOD  # private_key_jwt|client_secret_post|mtls
    if method == "private_key_jwt":
        return PrivateKeyJwt(key_path=config.BFF_JWT_SIGNING_KEY, alg=config.BFF_JWT_SIGNING_ALG)
    if method == "client_secret_post":
        return ClientSecretPost()
    if method == "mtls":
        return Mtls(cert=config.MTLS_CERT, key=config.MTLS_KEY)
    raise ValueError("Unsupported client auth method")
```


