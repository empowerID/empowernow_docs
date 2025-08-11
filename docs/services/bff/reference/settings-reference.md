---
title: settings.yaml Reference
---

Important settings (change per environment)

- Core: `ENVIRONMENT`, `HOST`, `PORT`, `API_PREFIX`
- OAuth/IdP: `OIDC_SCOPES`, `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, `AUTH_ISSUER`, `AUTH_JWKS_URL`
- Cookie/Session: `BFF_COOKIE_DOMAIN`, `SESSION_LIFETIME`
- Callback: `BFF_DYNAMIC_CALLBACK` vs `BFF_CALLBACK_URL`, `BFF_DEFAULT_HOST`, `BFF_DEFAULT_SCHEME`
- CORS: `CORS__ALLOW_ORIGINS` (JSON), dev origins for localhost
- Kafka: `KAFKA_BOOTSTRAP_SERVERS`, `KAFKA_TOPIC_PREFIX`

Full key list (with env overrides)

- app_name, app_description, version → `APP_NAME`, `APP_DESCRIPTION`, `APP_VERSION`
- debug → `DEBUG`
- enable_docs → `ENABLE_DOCS`
- api_prefix → `API_PREFIX`
- environment → `ENVIRONMENT`
- host, port → `HOST`, `PORT`
- log.level, format, json_format, enable_tracing → `LOG_LEVEL`, `LOG_FORMAT`, `LOG_JSON_FORMAT`, `LOG_ENABLE_TRACING`
- auth.dev_mode_enabled → `AUTH_DEV_MODE`
- auth.issuer, audience, jwks_url → `AUTH_ISSUER`, `AUTH_AUDIENCE`, `AUTH_JWKS_URL`
- auth.client_id, client_secret → `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`
- auth.oauth_scopes → `OIDC_SCOPES`
- pdp.* → `PDP_BASE_URL`, `PDP_TOKEN_URL`, `PDP_CLIENT_ID`, `PDP_CLIENT_SECRET`, `PDP_CACHE_DECISIONS`, `PDP_CACHE_TTL`, `PDP_ENABLED`
- membership.* → `MEMBERSHIP_*`
- cors.allow_origins/dev_origins/allow_credentials/allow_methods/allow_headers → `CORS_*`
- cache.type/redis_url/redis_db/redis_max_connections/ttl/enable_memory_cache/memory_ttl
- `services.<name>.*` → `<SERVICE>_BASE_URL`, `<SERVICE>_TOKEN_URL`, `<SERVICE>_CLIENT_ID`, `<SERVICE>_CLIENT_SECRET`, `<SERVICE>_CACHE_ENABLED`, `<SERVICE>_CACHE_TTL`
- crud.* (legacy) → `CRUD_*`
- kafka.enabled/bootstrap_servers/topic_prefix/client_id/acks/compression_type → `KAFKA_*`
- legacy_services.* → `LEGACY_SERVICE_<NAME>_URL`, `LEGACY_SERVICE_<NAME>_TIMEOUT`, plus breaker/cache limits via `CIRCUIT_BREAKER_*`, `RESPONSE_CACHE_*`, `REQUEST_MAX_BODY_SIZE`

Notes

- Env substitution uses `${VAR}` in YAML; ensure concrete values in Compose/K8s.
- Scopes often must include: `admin.api`, `application.all` per downstream requirements.

