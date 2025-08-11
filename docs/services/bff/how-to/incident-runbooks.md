---
title: Incident Runbooks — Common Scenarios
---

401 storm on /api/**

- Symptom: sharp rise in 401s, SPAs stuck on login
- Checks: cookie domain/scope, `/auth/session` truth, CORS allowlist; ForwardAuth headers present
- Action: fix cookie domain or allowlist; redeploy; verify 200s resume

PDP degraded

- Symptom: 5xx/latency in PDP client logs; 403s increase
- Checks: PDP health, network path, PDP caches
- Action: fail open only if policy allows; otherwise communicate outage; consider increasing deny TTLs temporarily

IdP down

- Symptom: login/callback failures; refresh errors
- Checks: IdP health; retry/backoff metrics; edge routes
- Action: keep existing sessions; disable features requiring fresh tokens; escalate

Redis unavailable

- Symptom: session lookups fail; 401s
- Checks: Redis health; persistence; memory policy
- Action: restore Redis; consider rolling session TTL; communicate re‑login requirement


