---
title: Operations
---

- Health: `/health` readiness/liveness returning JSON status and checks (Redis, IdP)
- Metrics (examples to expose):
  - `bff_active_sessions_total`
  - `bff_token_refresh_success_total`
  - `bff_token_refresh_failed_total`
  - `bff_session_binding_failures_total`
  - `traefik_forwardauth_rejected_total`
  - `bff_oauth_flow_duration_seconds`
- Logs: structured security logs for auth, CSRF, binding, refresh
- Rollouts: resource limits, PodDisruptionBudget, graceful shutdown on `shutdown` event

