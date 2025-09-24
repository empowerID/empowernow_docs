I reviewed how the IdP talks to its databases and pluggable stores and mapped where PAT support cleanly fits without fighting existing patterns.

### What exists today (by area)
- Storage backends and factories
  - `repositories/repository_factory.py`: selects Redis/YAML/Postgres stores for clients, users, identities via `get_*_repository`. This is your main DI point.
  - YAML/Redis variants exist for clients; users have Postgres JSONB (`PgUserRepository`) and YAML/Redis plugin stores in parallel.
  - Takeaway: You already support “pluggable stores”; new PAT storage should plug in similarly (Postgres primary; optional Redis cache; no YAML for PATs).

- SQL access helpers
  - `src/datastores/postgres.py`: returns `async_sessionmaker` for JSONB‑style repos (e.g., `PgUserRepository`, `PgClientRepository`, `PgIdentityRepository`). Those repos create simple tables (`users|clients|identities`) with JSON/JSONB payloads keyed by a scalar PK and do Core `insert/select`.
  - `IdP/src/db/engine.py` + `db/models/*` + `db/repository.py`: a second stack using SQLModel entities, a generic `SQLRepository` and row‑MAC signing via `FIPSCryptoService`.
  - Takeaway: Two parallel SQL patterns exist. For PATs, pick one and stick to it to keep the blast radius small. Given the JSONB repos are what your repositories factory uses today for live data, prefer “JSONB + Core + session_maker” for PATs to be consistent.

- Domain repos and tables
  - Clients: `postgres_client_repository.py` (table `idp.clients`, JSONB `data`), `redis_client_repository.py`, `yaml_client_repository.py`.
  - Users: `postgres_user_repository.py` (table `idp.users`, JSONB `data`), password helpers included.
  - Identities (delegations): `postgres_identity_repository.py` (table `idp.identities`, JSONB `data`).
  - Device/credential SQLModel tables exist (e.g., `db/models/credential.py`, `registered_device.py`) with row‑MAC via `db/repository.py` but aren’t wired through the factory above.
  - Takeaway: For runtime auth paths (PAT), the JSONB repos are the shortest path.

- Identity/ARN helpers
  - `stores/arn_mixin.py`: computes internal ARNs and supports an upgrade path.
  - This dovetails with the federation mapping guidance; use it to expose `identity_arn`/`account_arn` in PAT introspection.

### Recommended design choices (to solidify PAT and keep fit)
- Storage model (Postgres JSONB repo; consistent with `Pg*Repository`)
  - Table: `idp.personal_access_tokens`
    - Columns: `pat_id (TEXT PK)`, `token_hash (TEXT unique)`, `prefix (TEXT)`, `user_arn (TEXT)`, `tenant_id (TEXT)`, `scopes (JSONB)`, `client_id (TEXT null)`, `pairwise (TEXT)`, `created_at (TIMESTAMPTZ)`, `expires_at (TIMESTAMPTZ)`, `revoked_at (TIMESTAMPTZ null)`, `last_used_at (TIMESTAMPTZ null)`, `data (JSONB)` for future flags.
    - Indexes: `UNIQUE(token_hash)`, `INDEX(tenant_id, user_arn)`, `INDEX(prefix)`, `INDEX(expires_at)`.
  - Repository: `src/repositories/postgres_pat_repository.py` modeled after `PgClientRepository`:
    - `init_table()` + `_ensure_schema()`.
    - `issue()`, `revoke()`, `introspect(token_hash)` (constant‑time compare done at hash creation; DB uses equality on hash).
    - `touch_last_used(pat_id)` async update.
  - No YAML store for PATs (security); optional Redis cache is for introspection results only.

- Introspection service (IdP)
  - Endpoint: `POST /oauth/pat/introspect` (BFF‑only; protect by network/mTLS).
  - Response mirrors federation doc:
    - `active`, `identity_arn`, `account_arn`, `sub_effective` (identity‑first), `tenant_id`, `scopes`, `client_id`, `pairwise`, `expires_at`, `pat_id`, `prefix`.
  - Pairwise: compute as HMAC(server_salt, `tenant_id|user_arn|client_id_or_generic`) and persist in the PAT row at issue time for stability.

- Issue/list/revoke (IdP)
  - Endpoints: `POST /oauth/pat`, `GET /oauth/pat`, `DELETE /oauth/pat/{pat_id}`.
  - Token: `aria_pat_<8hex>_<>=32 chars of base62/hex>`, ≥256‑bit entropy.
  - Persist `sha256(token)` + `prefix`; never store raw token. Return raw token once.

- BFF integration (auth)
  - Token extractor for proxies:
    - OpenAI: read `Authorization: Bearer <token>`.
    - Anthropic: read `x-api-key` else fallback to `Authorization`.
    - Fast‑reject unless token starts with `aria_pat_` or looks like JWT (`..`).
  - JWT path: verify via IdP JWKS (existing design); build canonical subject using identity‑first (`identity_arn` else `account_arn`).
  - PAT path: call IdP introspection; cache result for 2–3s in Redis; build PDP subject with `user_arn` and `agent:devtool:{client_id or generic}:{pairwise}`.
  - Enforce scopes (`llm:proxy:openai` / `anthropic`), egress allowlists, budgets; emit receipts with `user_arn` and `agent_id`.

- Consolidation choice
  - Stay consistent with `Pg*Repository` JSONB stack for PATs now (fastest integration; aligns with existing factories).
  - Later, consider converging onto the SQLModel + `SQLRepository` row‑MAC path by incrementally migrating “runtime secrets” tables (PATs, device creds) to signed rows for stronger integrity guarantees.

### Small hardening touches (fit with your files)
- Use `src/datastores/postgres.get_session_maker` in the new PAT repo (consistent with `PgUserRepository`/`PgClientRepository`).
- Add metrics and audit:
  - PAT audit rows can reuse the pattern from `db/models/credential_audit.py` (or a JSONB “events” table) with “issued|revoked|introspected”.
- Use `arn_mixin.py` to normalize/expose ARNs in introspection so BFF doesn’t implement provider logic.
- Redis cache: reuse `src/services/redis_service` (already used by `RedisClientRepository`) for PAT introspection micro‑TTL caching.

### Gaps/risks to call out
- Dual SQL stacks: JSONB repos vs SQLModel+MAC. Pick JSONB for PATs now; plan consolidation later.
- Discovery/JWKS: ensure JWKS is published and stable; BFF should not decode JWTs without verification.
- YAML paths: Clients/users have YAML stores; PATs should not (avoid plaintext secrets on disk).

### Concrete next steps (fits repo structure)
- Add `src/repositories/postgres_pat_repository.py` (clone of `PgClientRepository` with schema above).
- Add a small `get_pat_repository()` in `repository_factory.py` and wire config knob (`pat_store.type=postgres`).
- Implement IdP routes (`/oauth/pat*`) using the new repo; use `FIPSCryptoService` for HMAC pairwise.
- Implement IdP `/oauth/pat/introspect`; protect it; add Redis micro‑cache in IdP if you expect load spikes.
- In BFF, add the proxy auth dependency + PAT introspection call and wire into `/proxy/openai/...` and `/proxy/anthropic/...`.

- This slots cleanly into your existing repositories and keeps the new PAT path aligned with how `Pg*Repository` classes manage schema and sessions, while honoring identity‑first ARNs from your federation doc.

---

## Final design (v1)

### Scope
- EmpowerNow-issued Personal Access Tokens (PATs) used by dev tools in place of vendor API keys.
- BFF proxies for OpenAI and Anthropic accept PATs or JWTs, resolve canonical identity, enforce PDP/budgets, and call vendors with server-held keys.
- Minimal, production-ready; no YAML store for PATs; short Redis micro-cache for introspection.

### Architecture fit
- IdP: adds PAT lifecycle + introspection; persists in Postgres (JSONB) using a new `PgPATRepository` (same pattern as `PgClientRepository`).
- BFF: adds proxy auth dependency that extracts vendor-native headers, classifies token (JWT vs PAT), verifies JWT via JWKS or introspects PAT, then builds identity-first `user_arn` and `agent:devtool` subject.
- PDP, budgets, receipts, analytics remain unchanged; only subject/agent identity and scopes are fed from PAT/JWT resolution.

### Data model (Postgres JSONB)
```sql
-- schema: idp
CREATE TABLE IF NOT EXISTS idp.personal_access_tokens (
  pat_id         TEXT PRIMARY KEY,
  token_hash     TEXT UNIQUE NOT NULL,         -- sha256 of raw token
  prefix         TEXT NOT NULL,                -- e.g., "aria_pat_ab12cd34"
  user_arn       TEXT NOT NULL,                -- auth:account:{idp}:{subject}
  tenant_id      TEXT NOT NULL,
  scopes         JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_id      TEXT NULL,
  pairwise       TEXT NOT NULL,                -- HMAC-derived stable id
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL,
  revoked_at     TIMESTAMPTZ NULL,
  last_used_at   TIMESTAMPTZ NULL,
  data           JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pat_token_hash ON idp.personal_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_pat_user    ON idp.personal_access_tokens(tenant_id, user_arn);
CREATE INDEX IF NOT EXISTS idx_pat_prefix  ON idp.personal_access_tokens(prefix);
CREATE INDEX IF NOT EXISTS idx_pat_expiry  ON idp.personal_access_tokens(expires_at);
```

### Repository (Postgres JSONB + Core)
- File: `src/repositories/postgres_pat_repository.py`
- Methods:
  - `issue(row: dict) -> str` (persist PAT metadata, return `pat_id`)
  - `revoke(pat_id: str) -> None` (set `revoked_at`)
  - `by_hash_active(token_hash: str) -> dict | None` (active, not expired)
  - `touch_last_used(pat_id: str) -> None`
  - `list_by_user(tenant_id: str, user_arn: str) -> list[dict]`
- Uses `get_session_maker` from `src/datastores/postgres.py`; table created idempotently via repo `init_table()` like existing Pg repos.

### Repository factory (DI)
- `repositories/repository_factory.py` adds `get_pat_repository()`
  - Only supports `postgres`; throws on YAML/Redis (security posture).

### IdP endpoints
- `POST /oauth/pat` (issue): returns raw `token` once, plus `pat_id`, `prefix`, `scopes`, `expires_at`.
- `GET  /oauth/pat` (list): returns masked prefix and metadata; never raw tokens.
- `DELETE /oauth/pat/{pat_id}` (revoke): sets `revoked_at`.
- `POST /oauth/pat/introspect` (BFF-only):
  - Accepts token in body or `Authorization: Bearer`.
  - Returns (identity-first): `{ active, tenant_id, identity_arn?, account_arn, user_arn, scopes, client_id?, pairwise, expires_at, pat_id, prefix }`.
  - Security: mTLS or network allowlist; rate-limited; 2–3s Redis micro-cache of positive results (never beyond `expires_at`).

### Pairwise derivation
- `pairwise = b64url(HMAC(server_salt, f"{tenant_id}|{user_arn}|{client_id or 'generic'}"))`
- Compute at issuance; persist in PAT row for stability; return via introspection.

### Single-tenant deployments (tenant_id as instance label)
- Our services run single-tenant per deployment. `tenant_id` functions as an instance label derived server-side from configuration, not client input.
- It scopes pairwise derivation per instance (privacy across dev/stage/prod) and keys metrics/audit/Kafka consistently.
- It is stored with PATs and returned by introspection for audit/debuggability; clients/tools do not need to send it.

### BFF proxy authentication
- Extraction:
  - OpenAI: `Authorization: Bearer <token>`
  - Anthropic: `x-api-key: <token>` (fallback to `Authorization`)
- Classification:
  - `token.count('.') == 2` → JWT → verify via IdP JWKS
  - `token.startswith('aria_pat_')` → PAT → call IdP introspect
  - else 401
- Subject construction:
  - `user_arn`: identity-first (use `identity_arn` if provided; else `account_arn`)
  - `agent_id`: `agent:devtool:{client_id or 'generic'}:{pairwise}`
- Enforcement:
  - Require scopes: `llm:proxy:openai` / `llm:proxy:anthropic`
  - PDP check, egress allowlist, budget hold/settle, receipts emission
  - Strip inbound `Authorization`/`x-api-key` before vendor egress; send server keys only

### Configuration
- IdP: `SQL_DATABASE_URL`, `PAT_PAIRWISE_SALT`, `PAT_DEFAULT_TTL_DAYS`, `REDIS_URL`
- BFF: `IDP_JWKS_URL`, `IDP_PAT_INTROSPECT_URL`, `PAT_CACHE_TTL_MS` (≈2000–3000), `OPENAI_SERVER_KEY`, `ANTHROPIC_SERVER_KEY`

### Metrics & audit
- IdP: `pat_issue_total`, `pat_revoke_total`, `pat_introspect_total{result}`, `pat_active_gauge`, audit log rows for issue/revoke/introspect
- BFF: `proxy_requests_total{vendor}`, `auth_failures_total{reason}`, `pat_introspect_latency_ms`, `budget_debits_total{user_arn,agent_id}`

### Security
- No YAML backend for PATs; store only `sha256(token)` + prefix; raw returned once
- Introspection locked to BFF (mTLS/allowlist); short cache; fail-closed
- Prefix validation on proxy routes to avoid relaying vendor keys
- ±60s clock skew on `expires_at`

### Testing
- IdP: issue → introspect (active) → revoke → introspect (inactive); pairwise stability
- BFF: PAT/JWT acceptance on both proxy families; fast-reject invalid prefix; revoked/expired deny ≤ 3s; receipts contain `user_arn` & `agent_id`

### Rollout
1) Ship IdP PAT repo + endpoints behind feature flag
2) Enable BFF proxy auth shim; configure URLs/keys
3) Seed PATs for internal users; verify Cursor/Claude flows
4) Enable metrics/alerts; canary; broaden

---

## Productionization summary (applied)

- Database & migrations
  - Postgres-only runtime. All schema managed by Alembic before app start (no app-run DDL). Compose includes an `idp-alembic` job to run `alembic upgrade head` against the IdP DSN secret.
- Routing & PDP mapping
  - BFF exposes: `/proxy/openai/*`, `/proxy/anthropic/*` (public) for dev tools.
  - IdP PAT admin routes are mapped with PDP authorization in `ServiceConfigs/BFF/config/routes.yaml`:
    - `GET /api/idp/oauth/pat` → resource `idp:pat`, action `list`
    - `POST /api/idp/oauth/pat` → resource `idp:pat`, action `issue`
    - `DELETE /api/idp/oauth/pat/{id}` → resource `idp:pat`, action `revoke`
  - `POST /api/idp/oauth/pat/introspect` is bearer-only service-to-service (no SPA session).
- Kafka events
  - IdP emits business events: `admin.pat.issued`, `admin.pat.revoked`, `admin.pat.list.viewed` to `ADMIN_KAFKA_TOPIC` (stack default: `identity.events`). Topics provisioned by `kafka-setup`.
- Frontend performance
  - SPA uses SWR + conditional GET (ETag/Last-Modified) for PAT list. Backend supports 304s.

```mermaid
flowchart LR
  subgraph DevTool
    A[Cursor/Claude/SDK]
  end
  subgraph BFF
    B1[Proxy /proxy/openai|anthropic]
    B2[PDP/Budget/Headers]
  end
  subgraph IdP
    I1[/POST /api/idp/oauth/pat*\n(admin UI/API)/]
    I2[/POST /api/idp/oauth/pat/introspect/]
    DB[(Postgres\nAlem bic)]
  end
  K[(Kafka identity.events)]
  P[(OpenAI/Anthropic)]

  A -->|PAT in vendor header| B1 --> B2 --> I2
  I2 -->|active + subject ARN| B2 --> P --> B1 --> A
  I1 -->|issue/revoke/list| DB
  I1 -->|admin.pat.*| K
  I2 -->|cache| DB
```

References:
- BFF routes and PDP mapping: `ServiceConfigs/BFF/config/routes.yaml`
- Compose Alembic runner: `CRUDService/docker-compose-authzen4.yml` (service `idp-alembic`)
- Kafka eventing reference: `pdp/docs/events/kafka_eventing_reference.md`

## Developer TODOs (implementation plan)

### Database & repository
- Create table `idp.personal_access_tokens` and indices in an idempotent migration.
- Implement `src/repositories/postgres_pat_repository.py` with methods: `issue`, `revoke`, `by_hash_active`, `touch_last_used`, `list_by_user`.
- Add `get_pat_repository()` in `repositories/repository_factory.py` (postgres only).

### IdP services
- Implement pairwise helper using FIPS HMAC (server salt; env-configured).
- Routes:
  - `POST /oauth/pat`: generate token (`aria_pat_<8hex>_<random>`), hash, persist, return raw once.
  - `GET /oauth/pat`: list masked PATs for caller; include scopes, created/last_used/expires.
  - `DELETE /oauth/pat/{pat_id}`: revoke; audit.
  - `POST /oauth/pat/introspect`: verify token → lookup by `token_hash`; return identity-first fields; touch `last_used_at`.
- Protect introspection via mTLS or IP allowlist; add rate limit middleware.
- Redis micro-cache (2–3s) keyed by `sha256(token)`; do not exceed `expires_at`.
- Emit Prometheus metrics and audit entries for issue/revoke/introspect.

### BFF proxy integration
- Add token extractor (OpenAI/Anthropic header shapes) and classifier (JWT vs PAT).
- Add JWT verification via IdP JWKS (no decode-only paths).
- Add IdP PAT introspection client with short timeout + micro-cache (2–3s).
- Build identity-first `user_arn` and `agent:devtool:{client_id}:{pairwise}` subject.
- Enforce scopes `llm:proxy:*`, PDP, egress allowlist, budget hold/settle, receipts.
- Strip inbound secret headers before vendor egress; use server keys.
- Add metrics and rate-limits for auth failures & introspection QPS.

### Policies & configs
- Add PDP scopes/policies for `llm:proxy:openai` and `llm:proxy:anthropic`.
- Add env/config keys documented above to IdP and BFF; wire into settings loaders.

### Tests
- Unit: repository CRUD; token issuance hashing; pairwise determinism; introspect paths; JWT verify error cases.
- Integration: IdP PAT lifecycle; BFF proxy with PAT/JWT; receipts contain identity-first subjects; budgets settle.
- Load: introspection cache effectiveness; IdP rate-limit/circuit-break behavior.

### Rollout & ops
- Feature flag `ENABLE_PATS`; canary to internal tenants; add dashboards & alerts for: PAT introspect errors, proxy auth failures, budget denials.
- Documentation page for users: how to generate PAT and configure dev tools.

### Stretch (optional, later)
- Environment-scoped prefixes (`aria_pat_dev_`, `aria_pat_prod_`).
- Row-MAC signed audit ledger table for PAT events (SQLModel), independent of hot-path repo.

---

## Hardening deltas (adopt now)

### Database & schema
- Add constraints:
  - `CHECK (expires_at > created_at)`
  - `CHECK (prefix ~ '^aria_pat_[a-f0-9]{8}$')`
- Add partial indexes:
  - `CREATE INDEX IF NOT EXISTS idx_pat_active ON idp.personal_access_tokens(token_hash) WHERE revoked_at IS NULL;`
  - `CREATE INDEX IF NOT EXISTS idx_pat_prunable ON idp.personal_access_tokens(expires_at) WHERE revoked_at IS NOT NULL OR expires_at < now();`
- Add future-proofing columns:
  - `pairwise_v SMALLINT DEFAULT 1`, `salt_kid TEXT NULL`
- Optional audit table (append-only): `idp.pat_audit(event_ts, pat_id, action, actor, ip, ua, event JSONB, prev_hash TEXT, hash TEXT)` with `hash = sha256(prev_hash || canonical_json(event))`.

### Token format & issuance
- Prefix per environment: `aria_pat_dev_ | aria_pat_stg_ | aria_pat_prod_`.
- ≥256-bit randomness; return raw once; zeroize buffers after hashing where feasible.

### Introspection API
- Protection: keep mTLS/allowlist; additionally accept a signed service token (`aud = idp.pat.introspect`).
- Backoff on repeated invalid tokens (per IP/prefix); do not hard negative-cache.
- Response envelope includes `version`, `not_before`, `pairwise_v`, `salt_kid`.

### BFF proxy specifics
- Streaming: true pass-through (no full buffering); settle budgets on final chunk with timeout fallback.
- Header hygiene: strip all inbound sensitive headers; forward only vendor-required headers. Drop `OpenAI-Organization`, `anthropic-*` unless explicitly supported.
- Model caps: normalize aliases → canonical before PDP/budgets.
- Org/project: select centrally from server config; ignore client-provided overrides.
- IdP outage: fail-closed. If a temporary allow is required, gate to ≤30s LKG cache and a low-risk allowlist.

### Scopes & policy
- Hierarchical scopes: `llm:proxy` → `llm:proxy:openai` → `llm:proxy:openai:model:gpt-4o`.
- PDP should key on `{tenant_id, user_arn, agent_id}` and deny unknown `agent:devtool` patterns.

### Rate limits & abuse
- Separate buckets: auth failures (per IP and prefix), introspect QPS with circuit breaker.
- Telemetry for revoked/expired uses to detect leaks.

### Observability
- Dashboards: PAT health (issue/revoke/introspect latency/errors), proxy traffic (vendor/model, success/denies, streamed bytes), top spenders by `{user_arn, agent_id}`.
- Redaction: ensure prompt/response redaction in logs; only hashes for correlation.

### DDL amendments (on top of base DDL)
```sql
ALTER TABLE idp.personal_access_tokens
  ADD COLUMN IF NOT EXISTS pairwise_v SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS salt_kid TEXT NULL,
  ADD CONSTRAINT pat_time_ck   CHECK (expires_at > created_at),
  ADD CONSTRAINT pat_prefix_ck CHECK (prefix ~ '^aria_pat_[a-f0-9]{8}$');

CREATE INDEX IF NOT EXISTS idx_pat_active
  ON idp.personal_access_tokens(token_hash) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pat_prunable
  ON idp.personal_access_tokens(expires_at)
  WHERE revoked_at IS NOT NULL OR expires_at < now();
```

### Introspection response (fields to include)
```json
{
  "version": 1,
  "active": true,
  "tenant_id": "acme",
  "user_arn": "auth:account:idp:12345",
  "identity_arn": "auth:identity:...",
  "scopes": ["llm:proxy:openai"],
  "client_id": "cursor",
  "pairwise": "p~Y2...",
  "pairwise_v": 1,
  "salt_kid": "kid-2025-09",
  "not_before": "2025-09-21T00:00:00Z",
  "expires_at": "2025-12-31T23:59:59Z",
  "pat_id": "pat_01H...",
  "prefix": "aria_pat_prod_ab12cd34"
}
```

### TODO additions (apply in this order)
- Migration: add constraints, partial indexes, `pairwise_v`, `salt_kid`.
- IdP: accept BFF service token for introspection; implement backoff on repeated invalid tokens.
- BFF: implement stream pass-through; header scrub allowlist; model alias normalization; org/project pinning; outage policy knobs.
- Policies: extend scopes hierarchically; deny nonconforming `agent:devtool` principals.
- Observability: dashboards + alerts per the Observability section.
- Tests: header fuzzing, streaming cancellation, revocation mid-stream behavior, salt rotation, org drift rejection.
- Rollout flags: `ENABLE_PATS`, `ENABLE_PAT_INTROSPECT_PUBLIC=false` by default; canary and monitor new metrics.
