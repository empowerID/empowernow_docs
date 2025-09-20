---
title: Configure CORS and Cookie Domain (Verified)
---

This guide explains how CORS allow‑lists and cookie domains work in the EmpowerNow stack for SPAs using the BFF.

What’s implemented (verified)

- CORS: The BFF parses an allow‑list for origins. See canonical settings: `../reference/settings-reference.md#cors` (`CORS__ALLOW_ORIGINS`, `CORS__DEV_ORIGINS`, `CORS__ALLOW_METHODS`, `CORS__ALLOW_HEADERS`, `CORS__ALLOW_CREDENTIALS`).
- Cookies: The session cookie name is `bff_session` (see security docs). Domain/scope are set by the BFF response and enforced by the browser; see canonical settings: `../reference/settings-reference.md#session-and-cookies` (`BFF_COOKIE_DOMAIN`, `SESSION_LIFETIME`).

Same‑origin SPA vs cross‑origin dev

```mermaid
flowchart LR
  subgraph Dev
    V[http://localhost:5173 SPA]
    B[http://localhost:8000 BFF]
  end
  subgraph Prod
    H[https://automate.ocg... SPA + /api]
    A[https://api.ocg... BFF]
  end
  V -- CORS allowlist --> B
  H -- Same-origin cookie --> A
```

Steps

1) Dev (cross‑origin)
   - Set `CORS__ALLOW_ORIGINS` to include your dev server (e.g., `http://localhost:5173`). See `../reference/settings-reference.md#env-CORS__ALLOW_ORIGINS`.
   - For streaming endpoints, set `ALLOWED_STREAM_ORIGINS` if you use SSE from a different origin.
   - Verify preflights succeed; unauthenticated calls should return JSON with CORS headers.

2) Prod (same‑origin)
   - Serve the SPA and BFF under the same host (e.g., `automate.ocg.labs...` routes `/api/**` to BFF).
   - The browser sends cookies automatically; no CORS preflight is triggered for `/api/**`.

3) Cookie domain
   - Use a shared parent domain at the ingress (Traefik) so the BFF sets the cookie for `.ocg.labs.empowernow.ai`. See `../reference/settings-reference.md#env-BFF_COOKIE_DOMAIN`.
   - Ensure `Secure` and `SameSite=Lax` are set; do not expose tokens to the browser.

Validate

- DevTools → Application → Cookies: `bff_session` present for your domain.
- Response headers on unauthenticated API call contain `Access-Control-Allow-Origin` with your dev origin.


