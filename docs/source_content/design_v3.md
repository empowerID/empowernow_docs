## VDS v3 — Design (aligned to our codebase)

See also: [Virtualization Phase 2 — Data Shaping, Merging, and Projection](./virtualization_phase2.md) and [SCIM Interface — VDS](./scim_interface.md).

    ### Developer-ready design adapted to our codebase

    Foundations we keep
    - Mapping, views, limits: `vds.dsl.mapping_loader` and `SearchExecutor` remain the projection/filter/paging layer.
    - Aggregation: keep `DirectoryAggregator`, extend with identity correlation and precedence rules.
    - Providers/catalog: keep `ProviderRegistry` and systems catalog loaders; reuse for per-partition sources.

    New config
    - File: `ServiceConfigs/vds/partitions.yaml`
    - Settings: add `PARTITIONS_FILE` env with default `ServiceConfigs/vds/partitions.yaml`
    - Hot-reload: plug into `ConfigReloader`

    Partitions file shape
    - Minimal and close to the architects’ proposal, tuned for our loader:

    ```yaml
    partitions:
    - name: corp_ad
        base_dn: "dc=corp,dc=example,dc=com"
        sources:
        - { system: corp_ad_sys, object_type: users }
        auth:
        chain:
            - { type: pass_through, system: corp_ad_sys }
        strategy: failover
        per_step_timeout_ms: 800
        throttle: { rules: [] }
        offline_cache:
            enabled: false
        schema:
        subschema_dn: "cn=subschema"
        objectclasses:
            - { name: inetOrgPerson, attributes: [cn, sn, mail, uid, memberOf] }
        attribute_types:
            - { name: mail, syntax: DirectoryString }
        scim: { directory: corp, resources: ["Users","Groups"] }

    - name: virtual_people
        base_dn: "o=virtual"
        sources:
        - { system: corp_ad_sys, object_type: users }
        - { system: hr_sys,      object_type: persons }
        merge_rules:
        identity:
            key_strategy:
            - { system: hr_sys, key: employeeNumber }
            - { system: corp_ad_sys, key: employeeID }
            fallback:
            - { join_on: mail }
        precedence: [hr_sys, corp_ad_sys]
        attributes:
            displayName: { pick: first_present, sources: ["hr_sys.displayName","corp_ad_sys.cn"] }
            memberOf:    { merge_unique: { sources: ["corp_ad_sys.memberOf"] } }
        auth:
        chain: []
        offline_cache: { enabled: false }
        schema:
        subschema_dn: "cn=subschema"
        objectclasses:
            - { name: virtualPerson, attributes: [cn, mail, employeeNumber, memberOf] }
        scim: { directory: virtual, resources: ["Users"] }
    ```

    Core components to add

    1) PartitionRegistry
    - Module: `vds.partitions.registry`
    - Loads and validates `partitions.yaml`, builds:
    - Base DN suffix matcher (longest match)
    - `naming_contexts()` from bases
    - Lookup by SCIM directory
    - Exposes:
    - `match_by_base_dn(dn) -> Partition | None`
    - `get_by_scim_directory(name) -> Partition | None`
    - `iter()` for diagnostics
    - Wire into `run_dev_server.py` deps via `ConfigReloader`

    2) LDAP RootDSE and subschema
    - RootDSE: augment current minimal with:
    - `namingContexts` from `PartitionRegistry`
    - Keep `supportedControl` and `supportedLDAPVersion`
    - Subschema handler:
    - If search base equals `partition.schema.subschema_dn` return generated entries for objectClasses/attributeTypes
    - Flag-gated by partition’s `schema` presence

    3) Search routing and aggregator construction
    - In `_handle_search` resolve partition by `base_dn`. Build a per-request `DirectoryAggregator`:
    - Single-source: provider = registry.get(system)
    - Multi-source: list of SourceSpec; inject `merge_rules` from partition
    - `SearchExecutor` gets the aggregator via `deps.aggregator` or a factory; continue to apply mapping views, paging cookies, limits

    4) Identity correlation in DirectoryAggregator
    - Extend `DirectoryAggregator` to:
    - Compute a correlation key per row using `merge_rules.identity.key_strategy`, fallback to `join_on` when missing
    - Group rows by correlation key, not subject
    - Apply precedence and attribute merge rules (we already support pick/merge_unique; extend to accept system-qualified paths)
    - Maintain deterministic cursors (composite cursor carries per-source offsets and last key)

    5) BindRouter (core)
    - Module: `vds.server.bind_router`
    - Route by DN suffix or UPN realm to partition, then through partition `auth.chain`:
    - pass_through: ldap3 bind to provider system; timeout per step
    - static: validate against partition static users (env-backed)
    - none: reject or accept SASL/EXTERNAL if configured later
    - Return success or invalidCredentials (49)
    - v1: implement pass_through + static; failover chain; breaker optional

    6) Resilience add-ons (v2)
    - HealthMonitor: Redis-backed; per provider state UP/DEGRADED/DOWN with hysteresis
    - ReauthThrottle: Redis TTL key per {partition, subject, client}
    - OfflineAuthManager:
    - ticket mode: short-lived, signed token bound to subject/client/partition (+ optional device); only accepted when provider not UP
    - verifier mode (optional flag): PBKDF2-HMAC-SHA256 for last success; only accepted when DOWN/DEGRADED; lockouts
    - Integrate throttle + offline paths in BindRouter decisions

    7) SCIM parity
    - Resolve SCIM directory to partition; reuse aggregator path for list/read
    - Expose `/Schemas` and `/ResourceTypes` built from partition `schema` + view projections where applicable
    - Keep existing SCIM auth

    8) Observability
    - Label all metrics/traces by `partition` and `system`
    - Add counters: `ldap_bind_total{result,partition}`, `ldap_search_total{result,partition}`, `cookie_overflow_total`
    - Gauge: `health_state{provider}`
    - Audit: bind decisions + filter hashes

    Feature flags
    - `VDS_PARTITIONS_ENABLE=true`
    - `VDS_SCHEMA_ENABLE=true`
    - `VDS_OFFLINE_AUTH_ENABLE=true`
    - `VDS_OFFLINE_VERIFIER_ENABLE=false`
    - `VDS_REAUTH_THROTTLE_ENABLE=false`

    Rollout phases
    - Phase 1: PartitionRegistry + search routing + RootDSE namingContexts
    - Phase 2: BindRouter (pass_through + static) + chain failover
    - Phase 3: SchemaService + subschema (flag)
    - Phase 4: Health, throttle, offline tickets (default)
    - Phase 5: Optional verifier mode

    ### Developer todo list (tied to our modules)

    Config & reload
    - vds-config-partitions-support
      - Add `PARTITIONS_FILE` to `settings.py` with default `ServiceConfigs/vds/partitions.yaml`.
      - Extend `ConfigReloader` to watch and hot-reload partitions; two-phase swap (parse/validate → atomic swap).
      - Add `/config/status` (FastAPI) exposing active mapping/filters/partitions version hashes.
      - Ship `ServiceConfigs/vds/partitions.yaml` example.

    Partitions & registry
    - vds-partitions-registry
      - New `vds/partitions/registry.py`: load/validate partitions, longest-suffix base-DN matcher, `namingContexts()`, SCIM directory map, optional realm→partition map.
      - Unit tests: longest-suffix, invalid config, realm routing.
    - vds-wire-registry-deps
      - In `run_dev_server.py`, construct `PartitionRegistry`, inject into deps, hook into reload loop.

    LDAP protocol surface
    - vds-rootdse-subschema-hooks
      - RootDSE: include `supportedLDAPVersion=3`, `supportedControl=1.2.840.113556.1.4.319`, and `namingContexts` from registry.
      - Subschema: if `partition.schema.subschema_dn` present, route `cn=subschema` reads to SchemaService; else omit.
    - vds-ldap-abandon-handler
      - Maintain `messageID→Task` map; cancel on Abandon (op=16) without response; conformance tests (no further entries/done).
    - vds-controls-criticality
      - Unknown critical control returns `12 (unavailableCriticalExtension)`.
    - vds-limit-result-codes
      - Map client sizeLimit/timeLimit to `4/3` and server admin ceilings to `11` (no cookie); tests.
    - vds-dn-policy
      - Preserve DN value case in outputs; RFC 4514 escaping; internal normalization only; tests.
    - vds-send-overflow-safe
      - On `_send` queue overflow, write unsolicited notice directly, `drain` once, then close (avoid recursive `_send`).

    Schema publication
    - vds-schema-service
      - New `vds/server/schema.py`: synthesize `objectClasses/attributeTypes` with private OIDs and matching rules aligned to normalizer; flag-gated.
      - Tests: subschema reads present/absent; OID stability.

    Search routing & aggregation
    - vds-ldap-search-routing
      - Resolve partition in `_handle_search`; build per-request `DirectoryAggregator`; pass to `SearchExecutor`.
    - vds-aggregator-from-systems
      - Helper to build aggregator from `ProviderRegistry` + systems catalog + `partition.sources`.
    - vds-aggregator-correlation
      - Implement correlation keys (key_strategy, fallback join), dedup by correlation key, precedence merge, conflict telemetry.
      - Preserve deterministic composite cursors.
    - vds-aggregator-concurrency
      - Concurrent prefetch across providers with per-provider timeout (300–500 ms); fill page from ready sources; metrics for latency, timeouts, per-page contribution counts.

    Paging & cookies
    - vds-paging-cookie-cap
      - Enforce base64url cookie ≤ 2048 bytes; overflow → `53` + empty cookie; optional zlib compression before HMAC.
      - Support key rotation (`kid`); metrics: `cookie_overflow_total`, `cookie_old_kid_total`.

    Bind routing & resilience
    - vds-bind-router-core
      - New `vds/server/bind_router.py`: pass_through (ldap3 to system) & static backends; DN suffix and UPN realm routing; integrate into `_handle_bind`.
      - Per-step timeout; metrics for failover steps.
    - vds-bind-circuit-breakers
      - Per-provider circuit breaker for bind steps; fast failover.
    - vds-rate-limit-lockout
      - Per-IP/principal lockouts (online/offline paths); configurable thresholds.
    - vds-health-monitor
      - Redis-backed provider health states (UP/DEGRADED/DOWN) with hysteresis.
    - vds-reauth-throttle
      - Redis TTL keys per `{partition, subject, client}` (+ device/mTLS fp if available).
    - vds-offline-auth
      - Ticket mode (signed, short TTL, bound to `{partition, subject, client}`); only when health ≠ UP. Verifier mode behind flag (PBKDF2-HMAC-SHA256 ≥ 600k, salt+pepper, TTL); invalidation on password change/disable events.

    SCIM parity
    - vds-scim-partition-routing
      - Resolve SCIM directory→partition; reuse aggregator & merge rules for SCIM list/read.
    - vds-scim-schema
      - Expose `/Schemas` and `/ResourceTypes` from partition schema; fallback when absent.

    Observability & audit
    - vds-observability-partition
      - Label metrics/traces by `partition` and `system`.
      - Add counters/gauges: `ldap_bind_total{result,partition}`, `ldap_search_total{result,partition}`, `provider_contrib_entries_total{partition,system}`, `bind_failover_steps_total{partition}`, `cookie_overflow_total`, `cookie_old_kid_total`, `offline_auth_allowed_total{mode,partition}`, `offline_auth_denied_total{reason}`, `health_state{provider}`.
    - vds-audit-events
      - Kafka audit: bind (subject hash, client, partition, chain step, health, offline mode), search (filter hash, base, page size, cookie present, partition).

    Networking edges
    - vds-proxyv2-pre-tls (optional)
      - Support PROXY v2 pre-TLS only (TLS passthrough LB); misordered header → notice + close; docs.

    Feature flags & docs
    - vds-feature-flags
      - Read flags: `VDS_PARTITIONS_ENABLE`, `VDS_SCHEMA_ENABLE`, `VDS_OFFLINE_AUTH_ENABLE`, `VDS_OFFLINE_VERIFIER_ENABLE`, `VDS_REAUTH_THROTTLE_ENABLE`.
    - vds-config-examples-docs
      - Provide `partitions.yaml` examples; update RUNBOOK and design with operational guidance.

    Acceptance tests
    - vds-tests-core
      - RootDSE namingContexts (multiple partitions), subschema reads, partition search routing, paging cookie invalid/overflow, provider concurrency fairness, bind realm routing and failover, admin limits mapping, DN case preservation, abandon handling, unknown critical control.

    This plan matches our modules and minimizes churn: we keep the current mapping/paging/executor structure, add a registry and routers/services around it, and extend aggregator capabilities.

    ---

    ## Protocol correctness and behavior (additions)

    - AbandonRequest
    - Keep the existing `messageID → asyncio.Task` tracking and cancellation (already present). Add conformance tests to assert: no further entries or done are emitted after abandon.

    - Result codes and limits
    - Client sizeLimit/timeLimit → `sizeLimitExceeded (4)` / `timeLimitExceeded (3)` without a response cookie.
    - Server ceilings (admin caps) → `adminLimitExceeded (11)` without a response cookie.

    - Controls criticality
    - Unknown critical control → `unavailableCriticalExtension (12)`.

    - DN policy
    - Do not lowercase DN values. Normalize only for internal keys/sort. Ensure RFC 4514 escaping in outputs.

    - RootDSE
    - Return `supportedLDAPVersion=["3"]`, `supportedControl=["1.2.840.113556.1.4.319"]`, and `namingContexts` populated from `PartitionRegistry`.

    ## Paging & cookies (clarifications)

    - Cookie cap and overflow semantics
    - Cap base64url-encoded cookie ≤ 2048 bytes. If overflow, respond `unwillingToPerform (53)` with an empty cookie control.
    - Optionally zlib-compress cookie state before HMAC to improve headroom (feature-flagged).

    - Invalid/expired cookie
    - Respond `unwillingToPerform (53)` with an empty cookie control.

    ## Aggregator fairness (extensions)

    - Concurrent prefetch
    - Fetch first chunks from all providers concurrently. Enforce a per-provider timeout (e.g., 300–500 ms) so slow sources do not stall the page. Fill the page from completed sources; laggards appear on the next page.

    - Dedup policy
    - Prefer dedup by correlation key (e.g., employeeNumber/email). Merge attributes via precedence/merge rules. Document behavior and add tests.

    ## Bind routing & resilience (extensions)

    - UPN realm routing
    - Route `user@realm` via a realm→partition map when DN suffix is absent/ambiguous.

    - Per-step breaker/timeouts
    - Apply a short per-step timeout and circuit-breaker per provider in bind chains to ensure fast failover.

    - Local rate-limit/lockout
    - Enforce per-IP/principal lockouts on bind attempts (online and offline).

    - Offline auth guardrails (when enabled)
    - Prefer ticket mode (signed, short TTL, bound to `{partition, subject, client}` (+ device/mTLS fingerprint when available)).
    - If verifier mode is later enabled, use PBKDF2-HMAC-SHA256 with ≥600k iterations, per-entry salt + server pepper; only when provider health != UP; immediate invalidation on password change/disable.

    - Re-auth throttle binding
    - Throttle keys bound to `{partition, subject, client}` (+ device/mTLS fingerprint if available).

    ## Schema publication (clarifications)

    - OIDs & matching rules
    - Assign stable private OIDs for published `attributeTypes/objectClasses` and ensure matching rules (e.g., caseIgnoreMatch) align with the filter normalizer. Flag-gate publication per partition.

    ## Networking edges

    - PROXY v2
    - If supported, consume PROXY v2 pre-TLS at the edge (document that only TLS-passthrough LBs are supported). Add negative tests for misordered headers. (Current implementation consumes after TLS; treat pre-TLS support as optional/flagged.)

    - StartTLS
    - v1 is LDAPS-only. Unknown ExtendedRequest (including StartTLS) should produce a notice and close.

    ## Observability & audit (extensions)

    - Metrics
    - `provider_contrib_entries_total{partition,system}`
    - `cookie_overflow_total`
    - `cookie_old_kid_total` (rotated but still accepted cookies)
    - `offline_auth_allowed_total{mode,partition}` / `offline_auth_denied_total{reason}`
    - `bind_failover_steps_total{partition}`
    - `health_state{provider}` gauge

    - Audit
    - Bind: subject hash, client, partition, selected chain step, provider health state, offline mode used.
    - Search: filter hash, base DN, page size, cookie presence, partition.

    ## Tests to add

    - Abandon cancels and emits no further entries.
    - Unknown critical control → 12.
    - Cookie overflow → 53 + empty cookie; compression path (if enabled).
    - Realm routing selection with ambiguous DN.
    - Provider timeout fairness (produce a full page from healthy sources).
    - Admin limits → 11.
    - DN value case preservation.

    ## TODO deltas (new tickets)

    - vds-ldap-abandon-handler: verify/codify abandon handling with tests.
    - vds-paging-cookie-cap: enforce 2 KiB cap, optional compression, overflow tests.
    - vds-aggregator-concurrency: concurrent prefetch with per-provider timeouts + metrics.
    - vds-bind-router-realm-routing: realm→partition map; tests.
    - vds-bind-circuit-breakers: per-provider breaker/timeouts; metrics.
    - vds-rate-limit-lockout: per-IP/principal lockouts (online & offline).
    - vds-proxyv2-pre-tls: optional PROXY v2 pre-TLS support + tests/docs.
    - vds-schema-oids-mr: stable private OIDs + matching-rule alignment; subschema tests.
    - vds-audit-events: Kafka audit for bind/search including partition/health/offline mode.