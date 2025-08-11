---
title: Admin Runbooks
---

## Diagnose 401 on /api/**
- Check cookie scope: `bff_session` domain includes current host
- Verify `/api/auth/session` returns authenticated
- If using Traefik ForwardAuth on this route, confirm edge forwards `Cookie` via `authRequestHeaders` and returns headers via `authResponseHeaders`

## Callback fails
- Confirm `OIDC_ISSUER` set and reachable
- If dynamic callbacks enabled: `BFF_DYNAMIC_CALLBACK=true` and `BFF_DEFAULT_HOST` configured
- Else ensure `BFF_CALLBACK_URL` is configured

## CSRF failures on POST/PUT/DELETE
- Ensure `_csrf_token` cookie set by a prior safe GET
- Send header `X-CSRF-Token` with the token value

## Emergency logout everywhere
- Call `/auth/logout?everywhere=true`; verify cookie cleared and session invalidated

## Health degraded
- `GET /health` to see Redis/IdP status; check logs and metrics for `bff_session_*` and token refresh counters
