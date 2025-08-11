---
title: Security Model
---

- Session cookie: `bff_session` (HttpOnly, Secure, SameSite=Lax, Domain per env)
- Session binding: IP hash and User-Agent hash; HMAC CSRF token (per CORRECTED guide)
- OAuth2: Pushed Authorization Requests (PAR) + DPoP + PKCE as implemented
- ForwardAuth: ultra-fast session existence check at edge
- Standard headers propagated to services: `Authorization`, `X-User-ID`, `X-Session-ID`, `X-Auth-Time`
- Backend validation: audience (`aud`) and scope checks per route

