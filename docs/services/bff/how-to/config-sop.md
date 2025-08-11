---
title: Config Change SOP — Source of Truth and Promotion
---

Source of truth

- `ServiceConfigs/BFF/config/*.yaml` for routes/idps/pdp/settings/logging
- Environment overrides for env‑specific toggles
- Traefik `dynamic.yml` for edge middleware/routers

Change steps

1) Edit config in a branch; run config lint and link check locally
2) Validate endpoint_map with sample requests in a dev stack
3) PR review; merge → promote to stage → prod via pipeline
4) Post‑deploy checks: health, auth 401/200 mix, PDP latency, error logs

Rollback

- Revert config commit and redeploy; confirm health and 200/401 mix normalizes


