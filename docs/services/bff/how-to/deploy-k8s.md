---
title: Deploy on Kubernetes
---

Deployment spec highlights (from `k8s/deployment.yaml`):
- Image: `empowernow/bff:2.1.0` (Always pull)
- Replicas: 3; rolling update (maxUnavailable: 1, maxSurge: 1)
- Probes: liveness/readiness/startup → `GET /auth/health`
- Resources: requests 256Mi/250m; limits 512Mi/500m; readOnlyRootFilesystem
- Security: drop ALL capabilities, runAsNonRoot: 1000
- Prometheus annotations: scrape `/metrics` on 8000
- EnvFrom: `bff-config` (ConfigMap), `bff-secrets` (Secret)
- Volumes: `emptyDir` for `/tmp` and `/app/cache`
- TerminationGracePeriodSeconds: 30; preStop sleep: 15s
- Anti-affinity across nodes

Ingress and middlewares (from `k8s/ingress.yaml`):
- TLS and entrypoints configured
- `bff-forwardauth` middleware -> `/auth/verify`
- `ratelimit` and `security-headers` middlewares

ConfigMap (from `k8s/configmap.yaml`):
- `SESSION_COOKIE_NAME: bff_session`
- `OIDC_ISSUER`, `OIDC_SCOPES`
- Security flags: `CSRF_PROTECTION`, `SESSION_BINDING`

Checklist:
- Set secrets (client credentials) in `bff-secrets`
- Configure `OIDC_ISSUER`, callback mode (dynamic/static), cookie domain, allowed redirect hosts
- Validate `/health` and metrics
