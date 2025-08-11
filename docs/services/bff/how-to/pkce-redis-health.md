---
id: pkce-redis-health
title: PKCE + Redis health checks
sidebar_label: PKCE/Redis health
---

Ensure the PKCE `code_verifier` is saved and retrieved correctly during login.

## Checklist

- BFF saves `code_verifier` under `pkce:{state}` on `/auth/login`
- Redis reachable for the BFF (`REDIS_URL` points to the correct DB)
- State TTL long enough for user to complete IdP login

## Validate in logs

- Look for `bff_pkce_verifier_retrieved` and `bff_pkce_verifier_added` during callback → token exchange
- Absence implies state expired or wrong Redis DB

## Quick tests

- Restart Redis and try login flow; verify `bff_pkce_verifier_not_found` disappears
- Confirm BFF and IdP use distinct Redis DBs to avoid key collisions

See also: `services/bff/reference/bff-idp-oauth-e2e`.



