## SCIM Interface — VDS (per‑system and unified directories)

### Scope

- Add a SCIM 2.0 read interface alongside LDAP.
- Expose multiple SCIM directories:
  - Per‑system passthrough directories (one per downstream system).
  - A unified VDS directory that merges sources via `DirectoryAggregator` and `merge_rules`.
- Reuse existing components: connectors, systems catalog, `DirectoryAggregator`, mapping DSL, PDP gating, caches, tracing/metrics.

---

### API Surface

- Base: `/scim/v2`
- Directory‑scoped resources (preferred):
  - `GET /scim/v2/{directory}/Users`
  - `GET /scim/v2/{directory}/Users/{id}`
  - `GET /scim/v2/{directory}/Groups`
  - `GET /scim/v2/{directory}/Groups/{id}`
- Unified alias (defaults to `{directory}=unified`):
  - `GET /scim/v2/Users`, `GET /scim/v2/Groups`
- Discovery (required by RFC 7644):
  - `GET /scim/v2/ServiceProviderConfig`
  - `GET /scim/v2/Schemas` (+ `GET /scim/v2/Schemas/{id}`)
  - `GET /scim/v2/ResourceTypes` (+ `GET /scim/v2/ResourceTypes/{name}`)
- Optional (non‑standard convenience):
  - `GET /scim/v2/Directories` → list available directories and capabilities
  - `GET /scim/v2/{directory}/Users?view=<name>` and `.../Groups?view=<name>` → select a reusable mapping view (see Views)
  - `POST /scim/v2/{directory}/Users/.search` and `POST /scim/v2/{directory}/Groups/.search` (and unified variants) → body mirrors GET params

Errors follow RFC 7644 (JSON with `schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"]`, `scimType`, `detail`).

---

### Directories Configuration

- New file: `config/scim_directories.yaml`
- Each directory defines Users/Groups sources, capabilities, and mapping profile.

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
        attributes:
          mail: { pick: first_present, sources: [addomain_ad.mail, auth0_eid.email] }
          groups: { merge_unique: { sources: [addomain_ad.memberOf, auth0_eid.groups], sort: ci } }
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
      mapping_profile: scim_user_ad
      capabilities:
        filters: { eq: true, sw: true }
        sortBy: [userName]
    groups:
      sources:
        - system: addomain_ad
          object_type: group
          action: search_groups
      mapping_profile: scim_group_ad
```

Notes:

- Keep existing `directories.yaml` for LDAP directories; SCIM uses its own loader/registry to avoid breaking changes.
- Use `build_systems_catalog(system_types_dir, systems_dir)` for provider instantiation.

---

### Request Pipeline

1) Parse SCIM query params: `filter`, `attributes`, `excludedAttributes`, `startIndex`, `count`, `sortBy`, `sortOrder`.
2) Resolve `{directory}` + resource (Users/Groups) to a directory spec.
3) Translate SCIM filter → internal `filter_json` (capability‑aware; case normalization based on config).
4) Apply optional view selection: if `view=<name>`, conjoin `view.filter` AND client filter, and enforce the view’s projection profile when `enforce_profile: true`.
5) Call `DirectoryAggregator.search(filter_json, page_size=count, cursor=derived_cursor, sort_spec)`.
6) Map rows via SCIM mapping profile; PDP gate attributes post‑map.
7) Build SCIM `ListResponse` or single resource, including `startIndex`, `itemsPerPage`, and optional `totalResults`.

---

### Filters

- Supported operators: `eq`, `ne`, `pr`, `co` (contains), `sw` (startsWith), logical `and|or`, parentheses.
- Attribute paths: `userName`, `name.givenName`, `name.familyName`, `displayName`, `emails.value`, `externalId`, `active`; for Groups: `displayName`, `members.value`.
- Capability flags allow per‑directory degradation (e.g., SCIM upstream passthrough supports only `eq` and `sw`).
- Case rules: case‑ignore on `userName`, `emails.value`, `displayName` unless overridden.

---

### Sorting

- `sortBy`/`sortOrder` mapped to aggregator `sort_spec`.
- Enforcement: if a directory advertises `capabilities.sortBy`, any other field results in `400` with `scimType: invalidValue`.
- Limitation: until sort‑aware cursors are implemented, sorting is applied within the returned page; the cursor remains subject‑based. Documented in ServiceProviderConfig and admin docs.

---

### Pagination (SCIM startIndex/count on cursor engine)

- Redis‑backed offset index per `(tenant, directory, resource, qhash, sort)` stores composite cursor snapshots every N results (e.g., 500).
- `startIndex=1` → `cursor=None`.
- For larger `startIndex`, select nearest snapshot and advance by consuming intermediate entries (not returned) until target index.
- `totalResults` mode via env:
  - `SCIM_TOTAL_RESULTS_MODE=off` (default): only page metadata returned; `totalResults` equals `itemsPerPage`.
  - `SCIM_TOTAL_RESULTS_MODE=approx`: bounded scan up to `SCIM_TOTAL_RESULTS_CAP`.
  - `SCIM_TOTAL_RESULTS_MODE=accurate`: scan to end (bounded by cap as safety) to approximate full count.

---

### Mapping & IDs

- Users:
  - `id`: directory‑scoped stable ID. Passthrough: native provider `id`. Unified: deterministic hash of `(tenant|directory|subject)` or merged primary `id` if stable.
  - `userName`: canonical `subject`.
  - `name.givenName`, `name.familyName`, `displayName`, `active`, `emails`: from merged attributes.
  - `groups`: omitted in list; included on detail if requested.
  - `meta.resourceType="User"`, `meta.location` built from route.
- Groups:
  - `id`: provider `id` for passthrough; unified stable ID.
  - `displayName`: group `cn`/name.
  - `members`: only on detail by default.
- Implement mapping profiles: `scim_user`, `scim_group` (unified) and optional passthrough variants `scim_user_ad`, `scim_group_ad`.

---

### Security, PDP, Limits

- Auth: OAuth 2.0 bearer (aud/scope), optional mTLS. Tenant bound to auth context.
- PDP: gate attributes post‑map; default deny on PDP failure.
- Limits: configurable `max_count`, filter depth/size caps, timeouts.
- Rate limiting: per route and client.

---

### Observability & Audit

- Metrics:
  - `scim_requests_total{resource,directory,result}`
  - `scim_latency_seconds`
  - `scim_pages_total`
  - `provider_calls_total{type,outcome}`
  - `vds_view_requests_total{view}` and `vds_view_latency_seconds_{count,sum}{view}` (when views are used)
  - Cache/index hit ratios
- Tracing: spans across SCIM → aggregator → providers with low‑cardinality attributes (`tenant`, `directory`, `resource`, `qhash`, `startIndex`, `count`, `cursor_present`).
- Audit: log query hash, directory, resource, and counts only (no PII values).

---

### Hot‑Reload & CDC

- Watch `scim_directories.yaml` and mapping profiles; on change, rebuild registry and flush relevant caches/index keys.
- CDC invalidation should clear per‑subject caches and any SCIM offset indexes that would include the affected subject(s).

---

### Test Plan

- Unit: SCIM filter parser (operators, attribute paths, precedence), mapping profiles, encoder, error mapping.
- Integration: Users/Groups list/detail across unified and passthrough directories, pagination (`startIndex`), sorting, PDP gating.
- Performance: large listings with offset snapshots; verify no duplicates/holes; p95 latency guard.
- Security: authZ (scopes), malformed filter handling, rate limit behavior.

---

### Rollout

- Phase 1 (read‑only): Users/Groups list/detail for unified + ≥1 passthrough directory; offset index with stride; PDP, auth, metrics.
- Phase 2 (capabilities & sorting): fuller filter set, optional `totalResults`, sort‑aware cursor.
- Phase 3 (optional writes): reuse WRITE_PROXY patterns to map SCIM writes to system actions behind PDP.

---

### Deployment & configuration

- Feature flag
  - SCIM endpoints are gated by `SCIM_ENABLED` (default true in dev). Set `SCIM_ENABLED=false` to disable entirely.

- Auth options
  - Static bearer: set `SCIM_REQUIRE_AUTH=true` and `SCIM_STATIC_BEARER_TOKEN=...`.
  - OAuth2 introspection: set `SCIM_REQUIRE_AUTH=true`, `SCIM_OAUTH_INTROSPECTION_URL=...` and optionally `SCIM_OAUTH_CLIENT_ID`/`SCIM_OAUTH_CLIENT_SECRET` for Basic auth to the introspection endpoint.
  - mTLS (header-enforced at L7): set `SCIM_REQUIRE_MTLS=true` and forward `X-Tls-Client-Verified: SUCCESS` (or provide `X-Client-Cert-Subject`).

- Rate limiting
  - Configure `SCIM_RATE_CAPACITY` and `SCIM_RATE_REFILL_PER_SEC` (global). Per-client, per-route limiting is enforced in-process with a small derived budget.

- Tenant context
  - Set `SCIM_TENANT` to stamp tenant on caches/metrics and stable ID derivation for unified directories.

- Directories config & hot reload
  - SCIM directories file path: `SCIM_DIRECTORIES_FILE` (default: `ServiceConfigs/vds/config/scim_directories.yaml`).
  - The SCIM app watches the file and reloads the in-memory registry on change.

- Connectors catalog
  - Set `SYSTEM_TYPES_DIR` (default `ServiceConfigs/connectors/system_types`) and `SYSTEMS_DIR` (default `ServiceConfigs/connectors/systems`) to point to CRUD-compatible connector catalogs.

- Writes & PDP
  - Enable writes with `SCIM_WRITES_ENABLED=true`. Optional reread after create/update: `SCIM_WRITE_REREAD=true`.
  - Configure idempotency window with `SCIM_WRITE_IDEMPOTENCY_TTL_S` (seconds).
  - Set `PDP_BASE_URL` to authorize writes via PDP. In production, enable fail-closed policy.

- totalResults
  - Prefer approximate or off: set `SCIM_TOTAL_RESULTS_ENABLED=false` (or see `DEPLOYMENT_CHECKLIST.md` totals guidance). If enabled, cap with `SCIM_TOTAL_RESULTS_CAP`.

- Observability
  - Metrics counters/histograms exposed: `scim_requests_total{result}`, `scim_latency_seconds` (summary + histogram buckets), `vds_provider_latency_seconds` (summary + buckets), `vds_aggregator_latency_seconds` (summary + buckets), cache hit/miss counters, provider calls by system/outcome, rate-limit total.
  - Tracing spans: `scim.list`, `scim.get` with low-cardinality attrs.
  - View metrics are included on the admin `/metrics` endpoint and tagged by `view`.

---

### Views (Reusable Virtual Views)

Reusable virtual views are named, read‑only slices defined in `mapping.yaml`:

```yaml
views:
  employees_minimal:
    base_dn: "ou=people,dc=example,dc=com"
    scope: sub
    profile: [uid, cn]
    enforce_profile: true
    filter: { eq: { attr: "objectClass", value: "inetOrgPerson" } }
```

- Selection (SCIM): `GET /scim/v2/{directory}/Users?view=employees_minimal`.
- Semantics:
  - Filter: `effective_filter = (client_filter AND view.filter)` (if both present).
  - Projection: when `enforce_profile=true`, response attributes are limited to the view’s `profile`.
- Discovery (Admin API):
  - `GET /admin/views` → list of views with base/scope/profile.
  - `GET /admin/views/{name}` → full view definition (without secrets).

---

### Mapping profiles and views — configuration examples

Below are end-to-end snippets showing how to combine directory mapping profiles with reusable views.

`ServiceConfigs/vds/config/scim_directories.yaml`:

```yaml
directories:
  unified:
    type: unified
    users:
      sources:
        - { system: corp_ad_sys,  object_type: users,  action: list }
        - { system: hr_sys,       object_type: persons, action: list }
      merge_rules:
        precedence: [hr_sys, corp_ad_sys]
        attributes:
          displayName: { pick: first_present, sources: ["hr_sys.displayName", "corp_ad_sys.cn"] }
          emails:      { merge_unique: { sources: ["hr_sys.email", "corp_ad_sys.mail"], sort: ci } }
      mapping_profile: scim_user        # unified SCIM user mapping
      capabilities:
        filters: { eq: true, sw: true, co: true, pr: true }
        sortBy: [userName, displayName]
    groups:
      sources:
        - { system: corp_ad_sys, object_type: groups, action: list }
      mapping_profile: scim_group       # unified SCIM group mapping

  corp_ad:
    type: passthrough
    users:
      sources:
        - { system: corp_ad_sys, object_type: user, action: search }
      mapping_profile: scim_user_ad     # AD-oriented mapping (givenName/sn → name.*)
      capabilities:
        filters: { eq: true, sw: true }
        sortBy: [userName]
    groups:
      sources:
        - { system: corp_ad_sys, object_type: group, action: search }
      mapping_profile: scim_group_ad    # AD-oriented group mapping
```

`ServiceConfigs/vds/config/mapping.yaml` (views only; SCIM mapping profiles are selected via directory `mapping_profile` as above):

```yaml
views:
  employees_minimal:
    base_dn: "ou=people,dc=example,dc=com"
    scope: sub
    profile: [userName, displayName]
    enforce_profile: true
    filter: { eq: { objectClass: inetOrgPerson } }

  engineering_only:
    base_dn: "ou=people,dc=example,dc=com"
    scope: sub
    profile: [userName, displayName, emails]
    enforce_profile: false
    filter: { eq: { department: Engineering } }
```

Notes:
- `scim_user_ad` adds `name.givenName`/`name.familyName` from AD fields (`givenName`/`sn`) in addition to default SCIM user fields.
- By default, SCIM group `members` are omitted in list and detail; clients can request them via `attributes=members`.
- Views conjoin with client filters and can restrict the projection when `enforce_profile: true`.


### Writes (create/update/delete)

When `SCIM_WRITES_ENABLED=true`, the SCIM app exposes directory-scoped write routes for Users and Groups.

- Status codes and headers
  - Create: 201 Created; headers: `Location`, `ETag` (weak). Body includes `meta.version` (weak ETag string) and `meta.location`.
  - Update: 200 OK; headers: `ETag`; body includes `meta.version`.
  - Delete: 204 No Content.
  - Errors: SCIM error envelope with `schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"]`, `status`, and `detail`.

- AuthZ (PDP)
  - Integrates with your AuthZEN PDP using a standard authorization decision request. The SCIM layer maps `(directory, resource, action, attributes[, target id/subject])` and actor claims into the PDP request context.
  - Deny → 403 SCIM error; obligations with `allowed_attributes` (if present) are enforced by intersecting outgoing params.
  - Fail-open vs fail-closed is configurable; production should fail-closed.

- Idempotency
  - Create honors the `Idempotency-Key` header; first success is cached in Redis for `SCIM_WRITE_IDEMPOTENCY_TTL_S` seconds and replayed.

- PATCH semantics
  - Users: supports `add|replace` for `userName`, `displayName`, `name.givenName`, `name.familyName`, `emails`, `phoneNumbers`.
  - Groups: supports `add|remove` for `members` (basic member list add/remove payloads) and `displayName`.
  - Unknown operations/attributes are ignored (or rejected via directory write policy or PDP).

- Concurrency
  - If the client sends `If-Match` with a weak ETag, the precondition is forwarded; providers should map version conflicts to 412/409. The SCIM layer maps precondition failures accordingly.

- Caching & indexes
  - On successful writes, SCIM invalidates its per-directory offset index snapshots and IdIndex entries for affected resources to avoid stale reads.

- Ops notes
  - Prefer write policies in `scim_directories.yaml` to restrict actions/attributes per directory.
  - Enable PDP for write authorization in production.
  - Consider enabling `SCIM_WRITE_REREAD=true` to return the full SCIM resource post-create (and optionally post-update) for client convenience.

#### Quickstart (writes)

```bash
# Create user (idempotent with Idempotency-Key)
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/scim+json" \
  -d '{
    "userName": "alice",
    "displayName": "Alice Example",
    "emails": [{"value":"alice@example.com","primary":true}]
  }' \
  "https://vds.example.com/scim/v2/unified/Users" | jq .

# Update displayName
curl -s -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/scim+json" \
  -d '{"Operations":[{"op":"replace","path":"displayName","value":"Alice E."}]}' \
  "https://vds.example.com/scim/v2/unified/Users/<id>" | jq .

# Delete
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  "https://vds.example.com/scim/v2/unified/Users/<id>" -i
```

### Mapping profiles

- Default mappers build SCIM User/Group from aggregator rows (`subject`→`userName`).
- Passthrough variants (`mapping_profile: passthrough`) preserve SCIM-like upstream payloads and normalize common fields (`userName`, `displayName`, `emails`).



