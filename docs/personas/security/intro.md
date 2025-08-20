# Security Officers & Auditors

Security model, controls, evidence, and reports — what to review, how to verify, and where to find artifacts.

## What you’ll learn

- How identity, sessions, and authorization work end‑to‑end (no browser tokens)
- The concrete controls enforced at the edge and in the BFF
- Where to find evidence (logs, metrics, events) and how to verify them
- Our compliance posture (FAPI/FIPS) and operational safeguards

## System overview (at a glance)

```mermaid
flowchart LR
  subgraph Client[Browser / API Client]
    UI[SPA]
  end
  subgraph Edge[Ingress / Traefik]
    FWD[ForwardAuth / security headers]
  end
  subgraph BFF[Backend‑for‑Frontend]
    AUTH[/auth/*\n(login, callback, verify, csrf, logout)/]
    API[/api/**\n(proxy + PDP)/]
  end
  subgraph Control[Control Plane]
    IDP[IdP (OIDC/OAuth 2.1)]
    PDP[PDP (AuthZ)]
    REDIS[(Redis: sessions + PDP cache)]
  end
  subgraph Backends[Backend Services]
    SVC[CRUD/PDP/other APIs]
  end

  UI -->|cookie| Edge --> BFF
  FWD -.->|/auth/verify| AUTH
  AUTH -->|code exchange| IDP
  API -->|subject, resource, action| PDP
  BFF -->|Bearer (server‑side)| SVC
```

Key points:

- End‑user identity comes from the OIDC ID token (or UserInfo). The BFF stores `user_id = id_token.sub` in the session. Service tokens used by the BFF to call backends are not user identity and never reach the browser.
- All SPA API calls are cookie‑based to the BFF; the BFF performs authZ per request via the PDP and injects server‑held Bearer tokens on upstream hops only when needed.

## Controls you can verify

- Session confidentiality and integrity
  - `HttpOnly`, `Secure`, `SameSite=Lax` session cookie; session rotation at login
  - Session binding (IP/User‑Agent hashing); rejects mismatches; metrics on failures
  - CSRF protection: double‑submit token (`_eid_csrf_v1` + `X‑CSRF‑Token`) for state‑changing methods
- Edge protections
  - ForwardAuth (`/auth/verify`) to gate protected routers (optional per route)
  - Strict security headers, rate limiting per router, request size limits
- Authorization
  - Path→resource/action mapping, PDP decision cache with separate TTLs for allow/deny
  - Correlated audit ID across edge→BFF→services
- Token handling
  - OAuth/OIDC terminated in the BFF only; no access tokens in the browser
  - Per‑service audience tokens held and refreshed by the BFF (client‑credential or token‑exchange)

See: BFF Security Model, ForwardAuth, Session binding & CSRF, FAPI/FIPS.

## Evidence and where to find it

- Metrics (Prometheus)
  - BFF: `bff_verify_duration_seconds`, `bff_session_binding_failures_total`, PDP latency/decision counters
  - Edge: `traefik_forwardauth_success_total`, `traefik_forwardauth_rejected_total`
- Logs (structured, correlation‑id based)
  - Login/logout, session lifecycle, PDP calls, upstream proxying with status codes
- Events (Kafka)
  - Security/audit topics for login/logout, session, and API access envelopes (PII‑safe)

How to verify quickly

- Attempt a state‑changing request without `X‑CSRF‑Token` → expect 403 CSRF
- Force session binding mismatch (spoof User‑Agent) → expect session re‑auth and counter increment
- Call a protected route directly (no session) → 401 at edge/BFF
- Check PDP deny path → 403 with decision evidence

## Compliance posture (summarized)

- FAPI: Authorization Code with PKCE/PAR, JARM when enabled, DPoP optional; private_key_jwt recommended for token endpoint auth
- FIPS: 140‑3 alignment where applicable; hardened OAuth client path; TLS 1.2+ (prefer 1.3), AES‑GCM suites

## Frequently asked (security)

- Where does identity come from? From the OIDC ID token; `sub` is the person’s subject. The BFF stores it in the session as `user_id`.
- Why is a backend service token’s `sub` not the user? Those tokens often have `sub = client_id` (for example, `bff-server`). They authenticate the BFF to backends and never reach the browser.
- Can the browser ever see tokens? No — only cookies. This prevents token exfiltration and simplifies zero‑trust enforcement.

## Deep‑dives and artifacts

- BFF → Security Model: ../../services/bff/explanation/security-model.md
- BFF → Session binding & CSRF: ../../services/bff/reference/session-binding-csrf.md
- BFF → ForwardAuth at the edge: ../../services/bff/reference/traefik-forwardauth.md
- BFF → FAPI support: ../../services/bff/reference/fapi-support.md
- BFF → FIPS 140‑3 posture: ../../services/bff/reference/fips-140-3.md
- BFF → Observability: ../../services/bff/reference/observability.md
- BFF → Logging & events: ../../services/bff/reference/logging-events.md
- BFF → Health & metrics: ../../services/bff/reference/health-metrics.md
- CRUD Service → mTLS (Design & Guide): ../../services/crud-service/reference/mtls_design.md

— For a visual walkthrough of the BFF, see: ../../services/bff/explanation/bff-visual-guide.md

