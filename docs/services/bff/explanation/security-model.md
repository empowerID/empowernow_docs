---
title: Security Model
---

Identity and tokens

- End-user identity is established from the OIDC ID token (or UserInfo) at login; the BFF stores `user_id = id_token.sub` in the session.
- Backend service access tokens used by the BFF are not user identity and remain server-side. Their `sub` commonly equals the OAuth client (e.g., `bff-server`).
- The browser never receives or interprets backend tokens.

Trust boundaries

- Edge (Traefik) ↔ BFF: session gating via ForwardAuth (`/auth/verify`)
- BFF ↔ Backends: server‑side tokens injected; no browser tokens cross the boundary

Controls

- Session cookie: `bff_session` (HttpOnly, Secure, SameSite=Lax, domain per env)
- Session binding: IP/User‑Agent hashing; reject on mismatch; metrics increment on failures
- CSRF: `_eid_csrf_v1` cookie + `X-CSRF-Token` header (HMAC‑based); required for state‑changing methods
- OAuth2: PKCE + PAR; optional DPoP and mTLS depending on env flags
- ForwardAuth: &lt;1ms session existence check at edge with `X-Session-ID`, `X-Auth-Time`, `X-Correlation-ID`
- Rate limiting: enforced at Traefik per router (burst/average) and documented in How‑to

Header contracts

- ForwardAuth response headers: `X-Session-ID`, `X-Auth-Time`, `X-Correlation-ID`
- Downstream headers to services: always `X-Correlation-ID`; `X-Original-User` when ARN available; `Authorization` when target requires it. The user ARN uses the IdP entry `provider` alias (fallback `name`) as the provider segment to keep identities stable across audiences of the same issuer.

What we do not do

- Never expose OAuth tokens to the browser
- No WebSockets exposed via BFF (SSE supported)

Evidence and audit

- Kafka topics (see Logging/Events reference): login/logout, session lifecycle, API access
- Metrics: `bff_verify_duration_seconds`, `traefik_forwardauth_{success,rejected}_total`, `bff_session_binding_failures_total`, PDP latency/decisions
- Logs: correlation‑id based tracing across edge and BFF

FAPI/FIPS posture

- FAPI features: PKCE, PAR, DPoP (middleware), optional enterprise mTLS
- FIPS: enabled via hardened OAuth client; see FIPS reference for rollout/evidence

See also: `../reference/session-binding-csrf`, `../reference/traefik-forwardauth`, `../reference/fapi-support`, `../reference/fips-140-3`, `../how-to/rate-limiting`

