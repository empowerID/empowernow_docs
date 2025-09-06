### Virtualization Phase 2 — Data Shaping, Merging, and Projection

This document describes the new core virtualization features added in Phase 2: merge rules, projection profiles, PDP attribute gating, and aggregator behavior. It covers design intent, configuration, and usage patterns to help authors and operators configure VDS safely and predictably.

### What’s new
- **Merge rules**: deterministic attribute unification across sources, with precedence and per-attribute policies.
- **Projection profiles**: reusable attribute sets per object; used by default when a client doesn’t request attributes explicitly.
- **PDP attribute gate**: optional allow-list gate applied after projection to enforce attribute-level authorization.
- **Aggregator enhancements**: stable multi-source merge with churn-safe composite cursor.

### Design goals
- Deterministic outcomes under churn: no duplicates/holes, stable ordering by `(subject.casefold(), id)`.
- Configuration-as-code with JSONSchema validation and safe defaults.
- Separation of concerns: correlation/joins are deterministic; fuzzy logic lives only in simulators.

### Configuration overview

1) `mapping.yaml` — objects, projection profiles, and merge rules

```yaml
objects:
  person:
    base_dn: "ou=people,dc=ldap,dc=internal"
    rdn: uid
    objectClasses: [inetOrgPerson, organizationalPerson, person, top]
    projection_profiles:
      default: [uid, cn, mail, objectClass]
    attributes:
      uid: "$.subject"
      cn:
        func: concat
        args: ["$.profile.given_name", " ", "$.profile.family_name"]
      mail: "$.emails.primary"

merge_rules:
  precedence: [sys_ad1, sys_ad2, sys_ldap, sys_rest]
  attributes:
    mail:
      pick: first_present
      sources: ["sys_ad1.mail", "sys_rest.email"]
    memberOf:
      merge_unique:
        sources: ["sys_ad1.memberOf", "sys_rest.groups"]
        sort: ci
```

2) `filters.yaml` — filter allow-list, matching rules, and default limits (mapping limits take precedence)

```yaml
filters:
  allow_attrs: [uid, cn, mail, objectClass]
  matching:
    uid: caseIgnore
    cn: caseIgnore
    mail: caseIgnore
  limits:
    defaultPageSize: 200
    sizeLimit: 0
    timeLimitMs: 0
```

3) Providers (e.g., `connectors.yaml`) — directories and sources used by the aggregator

```yaml
directories:
  person:
    sources:
      - system: sys_ad1
      - system: sys_ad2
      - system: sys_ldap
      - system: sys_rest
```

### Merge rules

- Top-level `precedence`: global order of systems for scalar picks (earlier wins).
- Per-attribute policies:
  - `pick: first_present` with an ordered `sources: ["sys.attr", ...]` list.
  - `merge_unique`: coalesce values from multiple sources; optional `sort: ci|cs`.

Behavioral notes:
- Empty values (`None`, empty string, empty list) are ignored for `first_present` fallback.
- Lists are deduplicated preserving determinism; when `sort` is set, output is sorted case-insensitively (`ci`) or case-sensitively (`cs`).
- Subject de-duplication groups by `subject.casefold()`; `id` is used as tiebreaker only for ordering.

### Projection profiles

- Define per-object reusable attribute sets.
- When a client does not request `attributes`, the executor applies `projection_profiles.default` (if present) and always includes `dn`.
- Example:

```yaml
objects:
  person:
    projection_profiles:
      default: [uid, cn, mail]
```

### PDP attribute gating

- Optional per-object toggle: `objects.<name>.pdp.attribute_gate: true|false` (default true).
- Applied after projection. The PDP returns an allowed attribute set; any projected attribute not allowed is dropped.
- Deny-by-default stance on PDP errors: if the PDP call fails and the gate is enabled, attributes are filtered to none (only `dn` remains).

Example toggle:

```yaml
objects:
  person:
    pdp:
      attribute_gate: true
```

### Aggregator behavior and paging

- Per-source fetches are merged into groups by `subject.casefold()` with stable ordering `(subject_cf, id)`.
- Composite cursor contains `{"subject_cf": <last>, "source_offsets": { <system>: <offset or next> }}`.
- Under churn, if a source still has rows > last consumed key, the cursor records `{subject_cf, id}` for that source instead of blindly advancing to provider’s next token, preventing duplicates and holes.

### End-to-end flow
1. Filter normalization via allow-list and matching rules.
2. Aggregator fetch → merge by subject with `merge_rules`.
3. Mapping engine renders object attributes (JSONPath/built-ins/pipelines).
4. Projection profile (or requested attributes) applied; `dn` always included.
5. PDP attribute gate filters projected attributes when enabled.
6. Next-page cookie is generated from the composite cursor, with HMAC rotation and size enforcement.

### Validation and safety
- JSONSchema validates mapping and filters; CI should run validation before deployment.
- Cookie size is enforced; oversize cookies increment a metric and are rejected at signing time.
- Plugin functions register via `plugins:` entries; mapping evaluation runs with argument validation and safe fallbacks.

### Operational guidance
- Prefer explicit `merge_rules` when consolidating attributes across systems; list multi-source attributes under `merge_unique`.
- Keep `projection_profiles.default` lean for common reads; define additional profiles for heavy attributes.
- Start with `attribute_gate: true` and authorize attributes via PDP policies.
- Monitor metrics: search/aggregator latencies, mapping computed/dropped counts, cookie oversize totals.

### Examples

Minimal person object with projection and merge rules:

```yaml
objects:
  person:
    base_dn: "ou=people,dc=ldap,dc=internal"
    rdn: uid
    objectClasses: [inetOrgPerson, organizationalPerson, person, top]
    projection_profiles:
      default: [uid, cn, mail]
    attributes:
      uid: "$.subject"
      cn: { func: concat, args: ["$.profile.given_name", " ", "$.profile.family_name"] }
      mail: "$.emails.primary"

merge_rules:
  precedence: [sys_ad1, sys_rest]
  attributes:
    mail: { pick: first_present, sources: ["sys_ad1.mail", "sys_rest.email"] }
    memberOf: { merge_unique: { sources: ["sys_ad1.memberOf", "sys_rest.groups"], sort: ci } }
```

### Backwards compatibility
- If `projection_profiles.default` is not defined, the executor includes all computed attributes (plus `dn`).
- If `merge_rules` is omitted, the aggregator defaults to source order for scalar selection and merges list attributes naively when provided by a single system.

### Testing summary
- Unit tests validate:
  - Projection profiles default + PDP gating behavior.
  - First-present fallback ignoring empty values.
  - `merge_unique` case-insensitive sorting and uniqueness.
  - Composite cursor records last consumed per-source offsets when rows remain.



### SCIM VDS (alongside LDAP)

The VDS now exposes a SCIM 2.0 API in addition to LDAP. Directories can be:
- Passthrough: project a single system to SCIM as-is.
- Unified: merge multiple systems via the aggregator with merge rules and mapping profiles.

#### API surface
- Base: `/scim/v2`
- Discovery: `GET /ServiceProviderConfig`, `GET /Schemas`, `GET /ResourceTypes`
- Directory-scoped resources:
  - Users: `GET /scim/v2/{directory}/Users`, `GET /scim/v2/{directory}/Users/{id}`
  - Groups: `GET /scim/v2/{directory}/Groups`, `GET /scim/v2/{directory}/Groups/{id}`
- When writes are enabled: `POST`/`PATCH`/`DELETE` for Users and Groups at the same paths.

#### Compose: VDS with SCIM (concise)

```yaml
vds:
  environment:
    - REDIS_URL=redis://shared_redis:6379/6
    - MAPPING_FILE=/app/config/mapping.yaml
    - FILTERS_FILE=/app/config/filters.yaml
    - PROVIDERS_FILE=/app/config/connectors.yaml
    # SCIM core
    - SCIM_ENABLED=true
    - SCIM_DIRECTORIES_FILE=/app/config/scim_directories.yaml
    - PAGE_SIZE_DEFAULT=500
    # SCIM auth (disable in dev unless configured)
    - SCIM_REQUIRE_AUTH=false
    # - SCIM_STATIC_BEARER_TOKEN=change-me
    # - SCIM_OAUTH_INTROSPECTION_URL=http://idp-app:8002/api/oidc/introspect
    # - SCIM_OAUTH_CLIENT_ID=vds-scim
    # - SCIM_OAUTH_CLIENT_SECRET=change-me
    - SCIM_REQUIRE_MTLS=false
    # Rate limiting & totals
    - SCIM_RATE_CAPACITY=100
    - SCIM_RATE_REFILL_PER_SEC=50
    - SCIM_TOTAL_RESULTS_ENABLED=false
    - SCIM_TOTAL_RESULTS_CAP=5000
    # Writes (feature-gated)
    - SCIM_WRITES_ENABLED=true
    - SCIM_WRITE_REREAD=false
    - SCIM_WRITE_IDEMPOTENCY_TTL_S=86400
    # PDP base URL for write authorization
    - PDP_BASE_URL=http://pdp:8001
    # CRUD-compatible connector catalogs
    - SYSTEM_TYPES_DIR=/app/ServiceConfigs/connectors/system_types
    - SYSTEMS_DIR=/app/ServiceConfigs/connectors/systems
    - MAX_COOKIE_BYTES=2048
  volumes:
    - ../ServiceConfigs/vds/config:/app/config:ro
    - ../ServiceConfigs/connectors/system_types:/app/ServiceConfigs/connectors/system_types:ro
    - ../ServiceConfigs/connectors/systems:/app/ServiceConfigs/connectors/systems:ro
    - ../IdP/certs:/app/certs:ro
```

#### SCIM settings reference
- `SCIM_ENABLED`: enable SCIM API (default true)
- `SCIM_DIRECTORIES_FILE`: path to `scim_directories.yaml`
- `PAGE_SIZE_DEFAULT`: default page size for list endpoints
- `SCIM_REQUIRE_AUTH`: require bearer token; use static token or OAuth introspection
- `SCIM_STATIC_BEARER_TOKEN`: dev/testing token
- `SCIM_OAUTH_INTROSPECTION_URL`/`SCIM_OAUTH_CLIENT_ID`/`SCIM_OAUTH_CLIENT_SECRET`: OAuth introspection
- `SCIM_REQUIRE_MTLS`: enforce client cert headers
- `SCIM_RATE_CAPACITY`/`SCIM_RATE_REFILL_PER_SEC`: rate limiter
- `SCIM_TOTAL_RESULTS_ENABLED`/`SCIM_TOTAL_RESULTS_CAP`: bounded `totalResults`
- `SCIM_WRITES_ENABLED`: enable write routes (default off in prod)
- `SCIM_WRITE_REREAD`: reread after create/update
- `SCIM_WRITE_IDEMPOTENCY_TTL_S`: Idempotency-Key cache TTL (seconds)
- `PDP_BASE_URL`: PDP base for write authorization
- `SYSTEM_TYPES_DIR`/`SYSTEMS_DIR`: CRUD-compatible connector catalogs

#### Directories configuration
- File: `ServiceConfigs/vds/config/scim_directories.yaml`
- Define Users/Groups with sources, merge rules, mapping profiles, and optional write allow-lists.

Example:

```yaml
directories:
  unified:
    type: unified
    users:
      sources:
        - system: addomain_ad
          object_type: user
          action: search_users
        - system: auth0_eid
          object_type: users
          action: list
      merge_rules:
        precedence: [addomain_ad, auth0_eid]
      mapping_profile: scim_user
      capabilities:
        filters: { eq: true, sw: true, co: true, pr: true }
        sortBy: [userName, displayName]
    groups:
      sources:
        - system: addomain_ad
          object_type: group
          action: search_groups
      mapping_profile: scim_group

  addomain_ad:
    type: passthrough
    users:
      sources:
        - system: addomain_ad
          object_type: user
          action: search_users
      mapping_profile: passthrough
      write:
        allow_actions: ["create", "update", "delete"]
        allow_attributes: ["subject", "displayName", "emails"]
```

#### Writes (opt-in)
- Endpoints: `POST`/`PATCH`/`DELETE` `/scim/v2/{directory}/Users|Groups[/{id}]`
- Responses: `201` with `Location` and `ETag` on create; `200` + `ETag` on update; `204` on delete
- Policy gates: directory `write.allow_actions`/`write.allow_attributes`
- Authorization: PDP coarse allow/deny per write via `PDP_BASE_URL` (403 on deny)
- Idempotency: `Idempotency-Key` supported for create; TTL via `SCIM_WRITE_IDEMPOTENCY_TTL_S`

#### Deployment notes
- Compose mounts and env vars above are required for SCIM and connector catalogs
- Provide these files:
  - `ServiceConfigs/vds/config/scim_directories.yaml`
  - `ServiceConfigs/connectors/system_types/*`
  - `ServiceConfigs/connectors/systems/*`
- Optional: expose SCIM externally via Traefik on the VDS host with path prefix `/scim/v2`

#### Operational guidance
- Start with `SCIM_REQUIRE_AUTH=false` in dev; enable static token or introspection in non-dev
- Keep `SCIM_TOTAL_RESULTS_ENABLED=false` unless required; tune cap for upstreams
- For production writes: define explicit allow-lists, enable PDP checks, consider `SCIM_WRITE_REREAD=true`
- Monitor request volume, latency, and provider histograms