
### High-value, low-effort and must-do to-dos
- JSON/YAML governance
  - Add JSONSchema validation for mapping/filters/providers YAML and CI check.
  - Add config hot-reload for mapping/filters/providers; bump mapping version and clear caches.
  - Document YAML governance and update README with DSL & config reference.
  - Include template gating flag `ENABLE_MAPPING_TEMPLATES`, `filters.limits` (mapping takes precedence), plugin entrypoints, spans (`mapping.eval`, `pdp.gate`), and reload/version metrics.
- Data shaping (mapping DSL)
  - Implement MappingEngine function registry and built-ins: coalesce, join, lower, upper, unique, sort, split, replace, regex, to_int, to_bool, when (conditional), default.
  - Support per-attribute transform pipelines via `{ pipe: [...] }` in YAML.
  - Enforce per-attribute options: `type`, `required`, `default`, `omit_if_empty`, `multi: {unique_sorted: true}`, `max_items`.
  - Integrate `utils/plugin_loader` to register custom mapping functions.
  - Extend `schema.example.yaml` with group object and attribute projection profiles.
  - Implement attribute projection profiles per object; use when `attributes is None`.
  - Instrument mapping with metrics/tracing: mapping latency, attributes computed/dropped.
  - Write unit tests for new DSL built-ins, pipelines, YAML validation, hot-reload.
- Aggregator and cookie polish (must-do correctness + small scope)
  - Load `merge_rules` from mapping YAML and pass to `DirectoryAggregator`.
  - Complete aggregator merge rules for scalars/lists and precedence behavior.
  - Add cookie size metrics and warnings; ensure oversize → 53 with empty paged cookie control.

See also: [Virtualization Phase 2 — Data Shaping, Merging, and Projection](./virtualization_phase2.md) for the consolidated docs on merge rules, projection profiles, PDP gating, and aggregator paging.

### Developer design spec (focused on “best-in-class data shaping”)

Scope
- Deliver a robust, configurable data shaping layer with:
  - YAML-defined objects (`person`, `group`, etc.), attribute mappings, allowlist/matching rules, limits, and merge rules.
  - Transform pipelines and rich built-ins for schema normalization.
  - Deterministic paging pipeline integrating mapping, PDP gating, and aggregator merge semantics.
- Constrain to search-only MVP; multi-source aggregator supported but defer advanced policies beyond documented merge rules.

Alignment with CRUDService patterns (adopt what fits)
- Adopt function registry pattern for mapping built-ins
  - Use a lightweight registry (inspired by `function_registry.py`) to register core and plugin functions for the MappingEngine.
- Reuse filter semantics as deterministic built-ins (not templating in mapping)
  - Provide `quote` (escaping), `ldap_single` (first-of-one), and boolean normalization as MappingEngine built-ins.
- Keep Jinja templating at the provider/connector layer only
  - System definitions (e.g., AD/Azure YAML) may use Jinja for request shaping via provider templating; the VDS LDAP mapping path remains deterministic and non-templated by default.
- Optional, sandboxed template node for rare mapping cases
  - Allow `{ template: "..." }` with a curated, safe Jinja environment (no I/O, limited filters); disabled by default, feature-flagged.
- Add dependency analysis for mapping
  - Compute JSONPath dependencies per attribute for validation, cache keying, and prefetch planning.
- Avoid heavy loaders/storage abstractions
  - Retain simple file-based config with JSONSchema validation and optional hot-reload; do not port large loader stacks.

Config model (YAML)
- files:
  - `config/mapping.yaml`: objects, attributes, built-ins, `merge_rules`, projection profiles.
  - `config/filters.yaml`: `filters.allow_attrs`, `filters.matching`, limits (optional).
  - `config/providers.yaml` or existing connectors YAML: directories and sources.
- schema (enforced via JSONSchema):
  - `objects.<name>`:
    - `base_dn`: string
    - `rdn`: string
    - `objectClasses`: list[string]
    - `attributes`: map attrName → spec
      - spec forms:
        - string JSONPath: `"$.foo.bar"`
        - literal: `"static"` or numeric/bool
        - built-in call: `{ func: "concat", args: [...] }`
        - pipeline: `{ pipe: [ <spec>, {"lower": true}, {"split": ","}, {"unique": true}, {"sort": "ci"} ] }`
        - template (optional): `{ template: "Full Name: {{ result.profile.given_name }} {{ result.profile.family_name }}" }` (safe env, curated filters only)
      - options:
        - `type`: string | number | bool | list | dn
        - `required`: bool
        - `default`: any
        - `omit_if_empty`: bool
        - `multi`: { `unique_sorted`: bool, `max_items`: int }
    - `projection_profiles` (optional): map profileName → [attrs]. Used by executor when `attributes is None`.
    - `pdp`: { `attribute_gate`: bool } default true
  - `merge_rules` (optional):
    - `precedence`: [systemName]
    - `attributes`:
      - `<attr>`:
        - `{ pick: first_present, sources: ["sys1.field", "sys2.field"] }`
        - `{ merge_unique: { sources: ["sys1.list", "sys2.list"], sort: "ci" } }`
- `filters`:
  - `allow_attrs`: [attr]
  - `matching`: { attr: caseIgnore|caseExact }
  - `limits`: `sizeLimit`, `timeLimitMs`, `defaultPageSize` (also allowed under `mapping.limits`; mapping takes precedence)

Mapping Engine enhancements
- Function registry
  - Registry pattern: `register(name: str, fn: Callable)`; seeded with built-ins.
  - Built-ins:
    - `concat(*args)`, `coalesce(a,b,...)`, `join(list, sep)`, `split(str, sep)`
    - `lower(x)`, `upper(x)`, `trim(x)`, `replace(s, pattern, repl)`, `regex(s, pattern, group?)`
    - `unique(list)`, `sort(list, mode=ci|cs)`, `to_int(x, default?)`, `to_bool(x, default?)`
    - `when(cond, then, else)`, where `cond` is truthy or comparison `{func:"eq",args:[...]}`
- Pipelines
  - Evaluate `{ pipe: [spec, {"lower": true}, {"split": ","}, {"unique": true}, {"sort": "ci"} ] }`
  - Each dict step maps to a simple transform function; order preserved.
- Dependency analysis
  - Compute referenced JSONPath keys per attribute (and per object) to validate mappings, improve error messages, and inform cache/prefetch strategies.
- Constraints enforcement
  - After computing each attribute:
    - Type check and cast where allowed.
    - `required`: if missing/empty → drop entry or log; for MVP, drop attribute and expose metric; consider strict mode later.
    - `omit_if_empty`: drop if `None`/empty string/list.
    - `multi.unique_sorted`: dedupe and sort (case-insensitive if configured).
    - `max_items`: truncate deterministically.

Projection profiles
- In `SearchExecutor._query_backend`:
  - If `attributes is None`, pick `person.projection_profiles.default` (or include all non-operational attributes if not provided).
  - Always include `dn`; PDP gating applied after projection when PDP enabled.

YAML hot-reload and versioning
- Add `ConfigReloader` watching mapping/filters/providers; on change:
  - Reload config; compute `v_hash` small hash; update `deps.mapping_cfg`.
  - Clear relevant L1/L2 caches for subjects and mappings; bump internal version for cookie envelope.
  - Emit metric `config_reload_total` and `mapping_version`.

Directory Aggregator merge rules
- Accept `merge_rules` in constructor; wire from `MappingLoader.config.objects.<dir>.merge_rules` or top-level.
- Current implementation already supports `first_present` and `merge_unique`; finalize behavior:
  - Scalars: `first_present` using precedence list; optional `fallback` source map.
  - Lists: merge unique; optional `sort: ci|cs`; maintain stable order by precedence then lexicographic.
- Ensure composite cursor tracks per-source “last consumed” `{subject_cf,id}` and uses start-after semantics.

Cookie robustness
- Enforce `max_cookie_bytes` strictly in `sign_cookie` and expose metric `cookie_oversize_total`.
- Tests:
  - Oversize composite cursor → LdapError(53) at executor; protocol returns paged response with empty cookie.
  - Rotation: primary/previous acceptance; tamper → reject.

Observability
- Metrics additions:
  - `mapping_latency_seconds` histogram; `mapping_attrs_computed_total`, `mapping_attrs_dropped_total{reason}`
  - `config_reload_total`, `mapping_version` gauge
  - `cookie_oversize_total`
- Tracing spans: `mapping.eval`, `aggregator.merge`, `pdp.gate`

Tests (must add)
- DSL built-ins and pipelines (unit)
- Per-attribute constraints enforcement
- Projection profiles behavior and default
- Mapping hot-reload: version bump; cache invalidation
- Aggregator merge rules correctness (scalars, lists, precedence) and churn invariants
- Cookie oversize and rotation semantics

Minimal code changes (where)
- `src/vds/dsl/mapping_eval.py`: add function registry, pipelines, constraints, expand built-ins.
- `src/vds/dsl/mapping_loader.py`: load `merge_rules`, `projection_profiles`; return in `MappingConfig`.
- `src/vds/exec/directory_aggregator.py`: consume `merge_rules` from config; finalize merge logic; keep composite cursor behavior; minor refactor for clarity.
- `src/vds/exec/search_executor.py`:
  - When `attributes is None`, use projection profile if available.
  - Wire `merge_rules` from `mapping_cfg` when constructing aggregator (if deps not already wired).
- `src/vds/utils/paging_cookie.py`: strict size enforcement + metric hook.
- `src/vds/observability/metrics.py`: add counters/histograms per above.
- Config reload: new module or extend loader with watcher; update deps and caches.
- `src/vds/utils/templating.py`: provide a safe, minimal Jinja env used only if `{ template: ... }` is enabled.
- `src/vds/dsl/dependency_analyzer.py` (new): extract JSONPath dependencies from attribute specs; integrate in validation and diagnostics.

Prioritization (HV/LE and must-do)
1) JSONSchema validation + CI (low effort, high risk reduction)
2) DSL function registry + core built-ins + pipelines (medium effort, high data shaping value)
3) Attribute constraints enforcement (low-medium effort, high data quality)
4) Projection profiles (low effort, high UX)
5) Aggregator merge rules completion (medium effort, correctness)
6) Cookie size metrics and oversize behavior (low effort, correctness)
7) Dependency analysis for mapping (low effort, improves validation/observability)
8) Hot-reload + version bump + cache clear (medium effort, operability)
9) Observability additions (low effort, future-proof)
10) Docs and examples (low effort)

If you confirm priorities, I’ll mark the first todo in progress and implement JSONSchema validation and projection profiles next.