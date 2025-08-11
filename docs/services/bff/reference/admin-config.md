---
title: Admin Configuration Guide
---

All fields below are present in code.

## Environment variables
- `OIDC_ISSUER` (required): issuer base for discovery and token endpoints
- `BFF_DYNAMIC_CALLBACK` (true|false): dynamic callback reconstruction
- `BFF_DEFAULT_HOST`: used when dynamic callbacks are enabled
- `BFF_DEFAULT_SCHEME`: defaults to `https`
- `BFF_CALLBACK_URL`: required when dynamic callbacks are disabled
- `BFF_COOKIE_DOMAIN`: domain for `bff_session` cookie; omit domain for localhost
- `BFF_ALLOWED_REDIRECT_HOSTS`: CSV allowlist for absolute return_to safety
- `OIDC_SCOPES`: space-separated scopes (e.g. must include `admin.api`, `application.all` when needed)

## Cookies set by BFF
- Session: `bff_session` (HttpOnly, Secure, SameSite=Lax, Domain per `BFF_COOKIE_DOMAIN`)
- CSRF: `_csrf_token` (middleware-managed; HMAC signed; header `X-CSRF-Token` required for state-changing requests)

## Headers propagated to services (edge/BFF)
- `X-User-ID`, `X-Session-ID`, `X-Auth-Time`
- `Authorization` forwarded as configured

## Health and readiness
- `GET /health` returns JSON with Redis and IdP checks

## Files referenced by code
- `config/routes.yaml`
- `config/idps.yaml`
