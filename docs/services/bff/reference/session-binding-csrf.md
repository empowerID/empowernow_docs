---
title: Session Binding and CSRF (Verified)
---

Session binding (from architecture docs)

- Bind session to IP prefix and User-Agent hash; validate on each request.
- Example implementation shows IPv4 /24 or IPv6 /48 hashing with SHA-256; on mismatch, reject and log.

CSRF (verified)

- HMAC-based CSRF token generation/validation pattern is shown in the architecture docs; `csrf.py` middleware lists exempt paths including `/auth/verify,/auth/session,/auth/login,/auth/callback,/auth/logout`.

Cookie attributes (from architecture docs)

- `bff_session` cookie: HttpOnly, Secure, SameSite=Lax; shared domain as needed.


