---
title: settings.yaml Reference
---

Use this page as the single source of truth for BFF settings. Headings act as deep-link anchors you can reference from tutorials and website pages.

## Contents
- [Core runtime](#core-runtime)
- [Authentication and OAuth/IdP](#authentication-and-oauthidp)
- [PDP integration](#pdp-integration)
- [Authorization mapping flags](#authorization-mapping-flags)
- [Membership PIP](#membership-pip)
- [CORS](#cors)
- [Session and cookies](#session-and-cookies)
- [Callback URL model](#callback-url-model)
- [Logging and observability](#logging-and-observability)
- [Kafka](#kafka)
- [Cache](#cache)
- [Service backends (generic mapping)](#service-backends-generic-mapping)
- [Legacy services](#legacy-services)

## Core runtime

| YAML path | Env var(s) | Notes |
|---|---|---|
| app_name, app_description, version | APP_NAME, APP_DESCRIPTION, APP_VERSION | Display/metadata only |
| environment | ENVIRONMENT | Affects env‑specific behavior/config |
| api_prefix | API_PREFIX | Global API prefix |
| host, port | HOST, PORT | Bind address/port |
| enable_docs | ENABLE_DOCS | Expose interactive docs if enabled |
| debug | DEBUG | Enables debug behaviors/logging |

## Authentication and OAuth/IdP

| YAML path | Env var(s) | Notes |
|---|---|---|
| auth.issuer | AUTH_ISSUER | OIDC issuer URL |
| auth.audience | AUTH_AUDIENCE | Expected audience for tokens |
| auth.jwks_url | AUTH_JWKS_URL | Optional override for JWKS |
| auth.client_id | AUTH_CLIENT_ID | OAuth client id |
| auth.client_secret | AUTH_CLIENT_SECRET | OAuth client secret |
| auth.oauth_scopes | OIDC_SCOPES | Space‑ or comma‑separated scopes |
| auth.dev_mode_enabled | AUTH_DEV_MODE | Looser checks for local/dev only |

## PDP integration

| YAML path | Env var(s) | Notes |
|---|---|---|
| pdp.base_url | PDP_BASE_URL | PDP endpoint base |
| pdp.token_url | PDP_TOKEN_URL | OAuth token endpoint if needed |
| pdp.client_id | PDP_CLIENT_ID | Client credentials for PDP |
| pdp.client_secret | PDP_CLIENT_SECRET | Client secret for PDP |
| pdp.cache.enable | PDP_CACHE_DECISIONS | Enable decision cache |
| pdp.cache.ttl_ms | PDP_CACHE_TTL | TTL for decision cache |
| pdp.enabled | PDP_ENABLED | Toggle PDP usage |

## Authorization mapping flags

| YAML path | Env var(s) | Notes |
|---|---|---|
| authz.validation.strict | AUTHZ_VALIDATION_STRICT | Fail‑closed on mapping/shape errors |
| authz.default_mapping.enabled | AUTHZ_DEFAULT_MAPPING_ENABLED | Enables default/fallback mappings |

## Membership PIP

| YAML path | Env var(s) | Notes |
|---|---|---|
| membership.* | MEMBERSHIP_* | Membership service/PIP configuration |

## CORS

| YAML path | Env var(s) | Notes |
|---|---|---|
| cors.allow_origins | CORS__ALLOW_ORIGINS | JSON/CSV of origins |
| cors.dev_origins | CORS__DEV_ORIGINS | Dev‑only origins for local tools |
| cors.allow_credentials | CORS__ALLOW_CREDENTIALS | Boolean |
| cors.allow_methods | CORS__ALLOW_METHODS | Methods list |
| cors.allow_headers | CORS__ALLOW_HEADERS | Headers list |

## Session and cookies

| YAML path | Env var(s) | Notes |
|---|---|---|
| cookie.domain | BFF_COOKIE_DOMAIN | Cookie domain (e.g., .example.com) |
| session.lifetime_seconds | SESSION_LIFETIME | Session TTL in seconds |

## Callback URL model

| YAML path | Env var(s) | Notes |
|---|---|---|
| auth.callback.dynamic | BFF_DYNAMIC_CALLBACK | Toggle dynamic callback model |
| auth.callback.default_host | BFF_DEFAULT_HOST | Used when dynamic enabled |
| auth.callback.default_scheme | BFF_DEFAULT_SCHEME | http/https |
| auth.callback.static_url | BFF_CALLBACK_URL | Used when dynamic disabled |

## Logging and observability

| YAML path | Env var(s) | Notes |
|---|---|---|
| log.level | LOG_LEVEL | info, debug, warn, error |
| log.format | LOG_FORMAT | text/json |
| log.json_format | LOG_JSON_FORMAT | Force JSON log output |
| log.enable_tracing | LOG_ENABLE_TRACING | Enable tracing emitters |
| observability.* | — | See `observability.md` for details |

## Kafka

| YAML path | Env var(s) | Notes |
|---|---|---|
| kafka.enabled | KAFKA_ENABLED | Toggle producer |
| kafka.bootstrap_servers | KAFKA_BOOTSTRAP_SERVERS | Host:port list |
| kafka.topic_prefix | KAFKA_TOPIC_PREFIX | Prefix for topics |
| kafka.client_id | KAFKA_CLIENT_ID | Producer client id |
| kafka.acks | KAFKA_ACKS | 0/1/all |
| kafka.compression_type | KAFKA_COMPRESSION_TYPE | gzip, snappy, lz4, zstd |

## Cache

| YAML path | Env var(s) | Notes |
|---|---|---|
| cache.type | CACHE_TYPE | redis, memory |
| cache.redis_url | CACHE_REDIS_URL | redis://host:port/db |
| cache.redis_db | CACHE_REDIS_DB | DB index |
| cache.redis_max_connections | CACHE_REDIS_MAX_CONNECTIONS | Pool size |
| cache.ttl_ms | CACHE_TTL_MS | Default TTL in ms |
| cache.enable_memory_cache | CACHE_ENABLE_MEMORY | Local memory layer toggle |
| cache.memory_ttl_ms | CACHE_MEMORY_TTL_MS | Memory TTL in ms |

## Service backends (generic mapping)

Use these patterns for downstream service configuration. Replace `<SERVICE>` with the upper‑snake service name.

| Pattern | Env var(s) | Notes |
|---|---|---|
| services.&lt;name&gt;.base_url | `&lt;SERVICE&gt;_BASE_URL` | Downstream base URL |
| services.&lt;name&gt;.token_url | `&lt;SERVICE&gt;_TOKEN_URL` | OAuth token endpoint |
| services.&lt;name&gt;.client_id | `&lt;SERVICE&gt;_CLIENT_ID` | Client credentials |
| services.&lt;name&gt;.client_secret | `&lt;SERVICE&gt;_CLIENT_SECRET` | Client credentials |
| services.&lt;name&gt;.cache.enabled | `&lt;SERVICE&gt;_CACHE_ENABLED` | Per‑service cache toggle |
| services.&lt;name&gt;.cache.ttl_ms | `&lt;SERVICE&gt;_CACHE_TTL` | Per‑service cache TTL |

## Legacy services

| YAML path | Env var(s) | Notes |
|---|---|---|
| legacy_services.* | `LEGACY_SERVICE_&lt;NAME&gt;_URL` | Legacy endpoints |
|  | `LEGACY_SERVICE_&lt;NAME&gt;_TIMEOUT` | Request timeouts |
| circuit_breaker.* | `CIRCUIT_BREAKER_*` | Global breaker knobs |
| response_cache.* | `RESPONSE_CACHE_*` | Global response cache |
| request.max_body_size | `REQUEST_MAX_BODY_SIZE` | In bytes |

---

### Notes
- Env substitution uses `${VAR}` in YAML; provide concrete values via Compose/K8s/runtime env.
- Typical auth scopes include: `admin.api`, `application.all` (adjust per downstream).
- For Experience app support, include the app origin in `CORS__ALLOW_ORIGINS` and dev tools (e.g., `http://localhost:5177`) in dev origins.

### Anchor index

Use these fragment IDs to deep‑link to specific settings from how‑tos and website pages. Patterned variables (e.g., `<SERVICE>_BASE_URL`) are not enumerated.

<!-- Core runtime -->
<span id="env-APP_NAME"></span>
<span id="env-APP_DESCRIPTION"></span>
<span id="env-APP_VERSION"></span>
<span id="env-ENVIRONMENT"></span>
<span id="env-API_PREFIX"></span>
<span id="env-HOST"></span>
<span id="env-PORT"></span>
<span id="env-ENABLE_DOCS"></span>
<span id="env-DEBUG"></span>

<!-- Authentication and OAuth/IdP -->
<span id="env-AUTH_ISSUER"></span>
<span id="env-AUTH_AUDIENCE"></span>
<span id="env-AUTH_JWKS_URL"></span>
<span id="env-AUTH_CLIENT_ID"></span>
<span id="env-AUTH_CLIENT_SECRET"></span>
<span id="env-OIDC_SCOPES"></span>
<span id="env-AUTH_DEV_MODE"></span>

<!-- PDP integration -->
<span id="env-PDP_BASE_URL"></span>
<span id="env-PDP_TOKEN_URL"></span>
<span id="env-PDP_CLIENT_ID"></span>
<span id="env-PDP_CLIENT_SECRET"></span>
<span id="env-PDP_CACHE_DECISIONS"></span>
<span id="env-PDP_CACHE_TTL"></span>
<span id="env-PDP_ENABLED"></span>

<!-- Authorization mapping flags -->
<span id="env-AUTHZ_VALIDATION_STRICT"></span>
<span id="env-AUTHZ_DEFAULT_MAPPING_ENABLED"></span>

<!-- Membership PIP -->
<span id="env-MEMBERSHIP_STAR"></span>

<!-- CORS -->
<span id="env-CORS__ALLOW_ORIGINS"></span>
<span id="env-CORS__DEV_ORIGINS"></span>
<span id="env-CORS__ALLOW_CREDENTIALS"></span>
<span id="env-CORS__ALLOW_METHODS"></span>
<span id="env-CORS__ALLOW_HEADERS"></span>

<!-- Session and cookies -->
<span id="env-BFF_COOKIE_DOMAIN"></span>
<span id="env-SESSION_LIFETIME"></span>

<!-- Callback URL model -->
<span id="env-BFF_DYNAMIC_CALLBACK"></span>
<span id="env-BFF_DEFAULT_HOST"></span>
<span id="env-BFF_DEFAULT_SCHEME"></span>
<span id="env-BFF_CALLBACK_URL"></span>

<!-- Logging and observability -->
<span id="env-LOG_LEVEL"></span>
<span id="env-LOG_FORMAT"></span>
<span id="env-LOG_JSON_FORMAT"></span>
<span id="env-LOG_ENABLE_TRACING"></span>

<!-- Kafka -->
<span id="env-KAFKA_ENABLED"></span>
<span id="env-KAFKA_BOOTSTRAP_SERVERS"></span>
<span id="env-KAFKA_TOPIC_PREFIX"></span>
<span id="env-KAFKA_CLIENT_ID"></span>
<span id="env-KAFKA_ACKS"></span>
<span id="env-KAFKA_COMPRESSION_TYPE"></span>

<!-- Cache -->
<span id="env-CACHE_TYPE"></span>
<span id="env-CACHE_REDIS_URL"></span>
<span id="env-CACHE_REDIS_DB"></span>
<span id="env-CACHE_REDIS_MAX_CONNECTIONS"></span>
<span id="env-CACHE_TTL_MS"></span>
<span id="env-CACHE_ENABLE_MEMORY"></span>
<span id="env-CACHE_MEMORY_TTL_MS"></span>

<!-- Legacy services / limits -->
<span id="env-LEGACY_SERVICE_NAME_URL"></span>
<span id="env-LEGACY_SERVICE_NAME_TIMEOUT"></span>
<span id="env-CIRCUIT_BREAKER_STAR"></span>
<span id="env-RESPONSE_CACHE_STAR"></span>
<span id="env-REQUEST_MAX_BODY_SIZE"></span>

