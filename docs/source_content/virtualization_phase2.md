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


