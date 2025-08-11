---
title: Logout Behavior (BFF + IdP)
---

Verified design

- SPA performs hard navigation to `/auth/logout?everywhere=true` and clears any local UI auth state.
- BFF invalidates Redis session, clears the `bff_session` cookie, and serves an intermediate HTML page that redirects to the IdP end_session endpoint (with meta-refresh fallback).
- BFF forces `post_logout_redirect_uri` to `https://<bff_host>/auth/login` to avoid landing on protected SPA routes.
- Back-compat shims exist under `/api/auth/logout` delegating to `/auth/logout`.


