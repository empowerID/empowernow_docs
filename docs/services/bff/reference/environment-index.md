---
title: Environment Variables Index
---

Sources

- Docker Compose (`CRUDService/docker-compose-authzen4.yml` bff service)
- K8s manifests (if present)
- `.env` for local development

Highlights

- OAuth/IdP: `OIDC_ISSUER`, `OIDC_AUTHORIZATION_URL`, `OIDC_TOKEN_URL`, `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, `OIDC_SCOPES`
- PAR/DPoP: `MS_BFF_PAR_ENABLED`, `MS_BFF_DPOP_ENABLED`, `MS_BFF_TOKEN_AUTH_METHOD`
- Cookie/Session: `BFF_COOKIE_DOMAIN`, `BFF_COOKIE_SECURE`, `BFF_COOKIE_SAMESITE`, `SESSION_LIFETIME`
- Callback: `BFF_DYNAMIC_CALLBACK`, `BFF_CALLBACK_URL`, `BFF_DEFAULT_HOST`, `BFF_DEFAULT_SCHEME`
- CORS: `CORS__ALLOW_ORIGINS`
- ForwardAuth headers (Traefik config): ensure middleware points to `/auth/forward`
- Keys: `BFF_JWT_SIGNING_KEY`, `KEYS_DIR`, `BFF_KEYS_DIR`
- Security toggles: `BFF_JWT_VERIFY_*`, `BFF_REDIS_ENCRYPT_SECRETS`, `BFF_TOKEN_MANAGER_CONCURRENCY_SAFE`
- Kafka: `KAFKA_*`


