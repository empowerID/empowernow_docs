### Executive summary
Make the graph the source of truth for policy attachment, precedence, and delegation. Keep the PDP free of direct graph calls by integrating two evaluation modes via the Membership PIP:
1) EPS mode (default) — PIP compiles and returns an Effective Policy Set; PDP evaluates locally with L1/L2 caches, CDC-driven invalidation, and LKG fallbacks.
2) Graph‑Eval mode — PIP calls Membership Service to evaluate RBAC (RTR) and PBAC/AppRights on the graph per request with strict guardrails.
Both modes share the same precedence, boundary checks, delegation handling, SLOs, CDC invalidation posture, and decision receipts; selection is per‑app/tenant.

### Goals
- Formalize interfaces and data contracts (EPS, delegation, CDC).
- Define precedence algorithm and boundary checks.
- Specify cache layers, keys, invalidation, and LKG behavior.
- SLOs, observability, failure handling, rollout, and tests.

### Non-goals
- Changing the external API pattern (still `resource.properties.pdp_application`).
- Replacing YAML policy authoring or S3/Git storage.

### Components
- Membership Service (Neo4j): authoritative model for `Policy` nodes, `POLICY_REF`, `DELEGATES_TO`, applications/domains.
- Membership PIP (existing `pdp/plugins/pips/membership_service_pip.py`): resolution, compilation, EPS build, CDC subscriber, caching.
- Redis L2 cache: shared EPS/delegation/roles.
- PDP: local evaluation using EPS + delegation; obligations/constraints composition; receipts; no live graph calls.
- CDC bus: emits `DELEGATES_TO`, `BELONGS_TO`, `CONTROLLED_BY`, `POLICY_REF`, policy rev bumps, app schema changes.

### Precedence and resolution
- Precedence score (lower wins): edge-local(10) < user(30) < group/org(40) < application(50) < domain-env(70) < domain-shared(80) < global(100).
- Resolution:
  1) Build a single ordered rule list from EPS (sorted by precedence then by stable rule order).
  2) Within the same precedence level, apply deny-overrides.
  3) Across levels, lower precedence score wins.
- Boundary: each rule carries `meta.application_id`; PDP asserts it equals the request `application_id` or `global`.

### Data contracts

- Fetch EPS (PIP ⇄ PDP)
```json
// request
{
  "subject": "auth:identity:tenant:user42",
  "application": "sharepoint-prod",
  "purpose": "access_decision",
  "if_none_match": "W/\"b9c8...\""
}

// response
{
  "status": "ok" | "not_modified",
  "etag": "W/\"b9c8...\"",
  "graph_snapshot_id": "g-170622-abc123",
  "cohort_eps": { "etag": "W/\"c0h0rt...\"", "compiled": [ /* rules */ ] },
  "subject_overlay_eps": {
    "etag": "W/\"ov3rlay...\"",
    "compiled": [
      {
        "policy_id": "sharepoint-document-access@3",
        "source": "user" | "edge" | "app" | "domain_env" | "domain_shared" | "global",
        "precedence": 50,
        "order": 12,
        "meta": {
          "resource": "document",
          "action": "read",
          "application_id": "sharepoint-prod",
          "external_ref": "s3://.../policy.yaml",
          "external_ref_sha256": "..."
        },
        "expr_ast": "<opaque-json-or-binary>",
        "obligations": [{"id":"audit_log","attrs":{"level":"info"}}]
      }
    ]
  },
  "provenance": {
    "policy_refs":[{"id":"...","rev":"...","external_ref":"s3://...","sha256":"...","application_id":"sharepoint-prod"}],
    "app_schema_sha":"…",
    "max_staleness_sec": 300
  },
  "signature": "JWS(...)"
}
```

- Delegation context (PIP ⇄ PDP)
```json
{
  "verified": true,
  "delegation_id": "4061…",
  "binding_valid": true,
  "trust_level": "medium",
  "capabilities": ["invoice:pay"],
  "constraints": {"spend_cap": 5000},
  "result_type": "success"
}
```

- PDP decision receipt (emitted)
```json
{
  "decision_id": "…",
  "eps_etag": "W/\"b9c8...\"",
  "graph_snapshot_id": "g-170622-abc123",
  "policy_refs": [{"id":"...","rev":"...","sha256":"..."}],
  "delegation_id": "4061…",
  "degraded": false
}
```

### Membership PIP interface (Python signatures)
```python
class EffectivePolicySet(BaseModel):  # trimmed
    etag: str
    graph_snapshot_id: str
    cohort_eps: Optional[CompiledChunk]
    subject_overlay_eps: CompiledChunk
    provenance: EPSProvenance
    signature: str  # JWS

class MembershipServicePIP(PIPPlugin):
    async def fetch_eps(self, subject_arn: str, application_id: str, if_none_match: Optional[str] = None) -> EffectivePolicySet | NotModified: ...
    async def verify_delegation(self, delegator_arn: str, delegate_arn: str, jkt: Optional[str] = None) -> Dict[str, Any]: ...
    async def get_application_policies(self, app_id: str) -> List[Dict[str, Any]]: ...  # optional endpoint if not present
```

Notes:
- Build EPS by traversing graph for policy refs (edge → subject → subject containers → application → domain env → domain shared → global).
- Fetch YAML via `external_ref`, verify `sha256` pinned on the graph edge, compile to AST, fill `meta`.
- Two-tier EPS: cohort baseline per `{role/group, app}` plus subject overlay for smaller cold compiles.
- Sign EPS payload with JWS; PDP verifies.

### Caching

- L1 (PDP): in-process LRU; TTL 5–30s; key: `eps:{subject}:{app}:{etag}`.
- L2 (Redis): TTL 1–5 min; keyspace:
```
authz:tenant:{tid}:eps:{subject_arn}:{app}:{etag}       -> gzipped EPS blob
authz:tenant:{tid}:eps_revindex:{graph_node_id}         -> set of {subject_arn}:{app}
authz:tenant:{tid}:deleg:{from}:{to}:{service}:{jkt}    -> {verified, edge_id, trust, caps, constraints, exp}
authz:tenant:{tid}:roles:{subject_arn}:{opts_hash}      -> role list
```
- LKG (PDP local disk, encrypted): `$STATE_DIR/eps-lkg/{tid}/{subject_arn}/{app}.json`.

TTL guidance:
- `deleg:*` ≤ 60s (plus CDC hard-evict).
- EPS obeys `provenance.max_staleness_sec`.

### CDC → precise invalidation
- Maintain reverse index in PIP while building EPS: `graph_node_id → {subject_arn:app}`.
- Invalidation map:
  - `DELEGATES_TO.{created,updated,revoked}`: evict `deleg:{from}:{to}:*`, and EPS for `from` if edge-local policies exist; mark LKG unusable for delegation context.
  - `POLICY_REF.{added,removed}` on node X: read `eps_revindex:{X}`; evict listed EPS keys.
  - `IDENTITY.BELONGS_TO.{added,removed}` / `CONTROLLED_BY.{...}`: evict `roles:{subject}` and `eps:{subject}:*:*`.
  - `POLICY.rev_bumped(policy_id@rev)`: evict all EPS containing that ref (keep a policy→eps index or scan provenance in Redis sets).
  - `APPLICATION.schema_changed(app_id)`: evict `eps:*:{app_id}:*`.

Hard-evict fast-path:
- For high-risk revocations (delegations, critical roles, explicit policy removals), publish a “hard-evict” that disables LKG for impacted keys.

### PDP evaluation flow
1) Parse request; read `resource.properties.pdp_application`.
2) Enrich subject (via PIP as needed for roles).
3) For OBO: `verify_delegation(...)` with `jkt`; put into `context.delegation`; emit `azp_constraints` from edge `constraints`.
4) Fetch EPS (L1 → L2 → `fetch_eps` with `If-None-Match`); verify signature and boundary `application_id`.
5) Evaluate compiled rules in precedence order with deny-overrides at the same level.
6) Collect obligations; emit decision + obligations + constraints + receipt.

Degraded-mode policy:
- If EPS stale but within `max_staleness_sec`: allow with `degraded=true` receipt if policy marks low risk; otherwise deny or constrained permit.
- For delegation context: do not use LKG; require fresh verification or deny.

### Security and integrity
- Verify policy blob integrity: compare compiled `external_ref_sha256` with the graph-pinned hash.
- EPS JWS signature verification in PDP.
- App boundary enforcement during evaluation (defense in depth).

### Observability
- Metrics:
  - `pdp_decision_latency_ms{path="cached|cold"}`
  - `eps_cache_hit{tier="L1|L2"}`
  - `pdp_degraded_mode_total`
  - `pip_build_duration_ms`
  - `cdc_invalidation_lag_ms`
- Logs: correlation id, `graph_snapshot_id`, `eps_etag`, `delegation_id`, matched `policy_id@rev`.
- Tracing: spans for `fetch_eps`, delegation verify, evaluation.

### SLOs
- Latency: PDP cached p99 ≤ 10 ms; cold EPS fetch adds ≤ 15 ms p99; PIP compile p99.5 ≤ 40 ms.
- Freshness: CDC e2e p99 ≤ 2 s; honor `max_staleness_sec`.
- Availability: PDP serves ≥ 30–60 min on LKG (except keys flagged by hard-evict).
- Correctness: Shadow/dual achieves zero diffs ≥ 7 days before cutover.

### Failure handling
- PIP/Redis unavailable: serve LKG within staleness budgets; mark `degraded=true`. For delegation, deny if cannot re-verify and TTL expired.
- CDC delayed: rely on staleness + risk policy; alert on `cdc_invalidation_lag_ms` breaches.
 - Retry/backoff: at most 1 retry (+10ms) on transient errors; mark `degraded=true` if retry path triggers.

### Rollout
- Phase 0 (shadow): PIP builds EPS; PDP keeps legacy; diff decisions and log.
- Phase 1 (dual): PDP uses EPS with legacy fallback; receipts show degraded if fallback used.
- Phase 2 (clean): disable legacy; keep LKG.
- Flags: `USE_EPS`, `EPS_LKG_MAX_AGE_SECONDS`, `CDC_INVALIDATION_ENABLED`.

### Test plan
- Golden tests: fixed graph/policies exercising precedence and deny-overrides; parity with legacy.
- Property-based: random graphs/policies; invariants hold (determinism, precedence, boundary).
- CDC chaos: out-of-order/dropped events; no stale grants beyond `max_staleness_sec`.
- Delegation binding: wrong `jkt` fails; revoke edge → no LKG.
- Perf: compile throughput, Redis hit ratio, p99 latencies.
- Security: SHA/signature mismatch → EPS build fails-closed; cross-app rule → PDP rejects.

### Changes to `membership_service_pip.py` (incremental)
- Add `fetch_eps(subject_arn, app_id, if_none_match=None)` that:
  - Gathers policy refs via existing `get_person_policies(...)` + `get_application_policies(app_id)` (add endpoint if missing).
  - Fetches YAML by `external_ref`, verifies SHA, compiles to AST, produces EPS with precedence and JWS signature.
  - Writes Redis entries and reverse indexes.
- Add Redis adapter (optional) wrapping `SimpleCache` for L2.
- Add CDC subscriber to evict keys per mapping above.
- Reuse existing delegation methods; ensure delegation cache key includes `jkt`.

### Open questions
- Decide signing root (PIP-only vs org-wide signing service) for EPS JWS (Phase 2+ only).
- Introduce cohort EPS now or later, based on compile cost profiling (Phase 2+).

### Additional engineering details

#### EPS encoding, size, and compilation cost
- Use compact, deterministic encoding for `expr_ast` (e.g., JSON AST with stable key ordering, or a binary form). 
- Apply payload compression at rest/in-transit:
  - Redis values: `zstd`-compressed EPS blobs.
  - HTTP PIP → PDP: enable `Content-Encoding: zstd` (or gzip if zstd not available).
- Deterministic rule ordering: include `precedence` and a monotonic `order` within the EPS to guarantee reproducible evaluation and receipts.
- Prefer two-tier EPS (cohort + subject overlay) to reduce cold compilation churn.

#### Pluggable data providers (Membership API, not Neo4j)
The PIP talks only to the Membership Service REST API. For future‑proofing, keep a small provider interface to allow swapping API versions/mocks without changing PDP logic — never a direct Neo4j driver.
```python
class MembershipAPIProvider(Protocol):
    async def get_policy_refs_for_identity(self, identity_arn: str, app_id: str) -> list[PolicyRef]: ...
    async def get_application_policies(self, app_id: str) -> list[PolicyRef]: ...
    async def verify_delegation(self, delegator_arn: str, delegate_arn: str, jkt: Optional[str] | None = None) -> Dict[str, Any]: ...
    async def evaluate_on_graph(self, request: dict) -> dict: ...
```
Implementations: Membership REST v1, Membership REST v2, test/mocks. Any graph/DB pluggability (Neo4j/OpenFGA/SQL) lives inside the Membership Service and is out of scope for the PDP.

#### Deployment scope
- Single-tenant: no tenant prefixes or separate Redis DBs required; keep default key formats and a single cache namespace.

#### Revocation fast-path and LKG policy
- On high-risk CDC (delegation revoked/expired, critical role removal, explicit policy removal), publish a dedicated "hard-evict" message.
- PDP behavior for impacted principals/apps:
  - Evict L1 immediately; delete L2 keys.
  - Mark LKG as **unusable** for decisions requiring the revoked relationship/policy (force fresh EPS or deny based on risk policy).

#### CDC event schemas (illustrative)
```json
// policy ref added
{
  "topic": "policy_ref.added",
  "event_id": "...",
  "node_id": "auth:identity:tenant:user42",
  "policy_id": "sharepoint-document-access",
  "rev": "3",
  "application_id": "sharepoint-prod",
  "ts": "2025-06-22T12:34:56Z"
}

// delegation revoked
{
  "topic": "delegates_to.revoked",
  "event_id": "...",
  "from": "auth:identity:tenant:user42",
  "to": "auth:identity:tenant:agent123",
  "delegation_id": "4061...",
  "reason": "user_requested",
  "ts": "2025-06-22T12:35:10Z"
}
```
Consumers must be idempotent (use `event_id`) and tolerate out-of-order delivery; rely on reverse index to target evictions.

#### Policy supply-chain integrity
- Store and verify `external_ref_sha256` for each `POLICY_REF`. 
- Optionally enforce signed Git commits for policy repos, and validate signature provenance during EPS build.
- EPS is JWS-signed by the PIP; PDP verifies before use.

---

## Where it could tip into overengineering (and how to prevent it)

These items add complexity without immediate payoff. Make them phase‑later for v1:

| **Area** | **Overhead risk** | **Recommendation for v1** |
|---|---|---|
| Cohort + overlay EPS | Extra code paths & invalidation logic | Defer. Start with a single EPS per `{subject, app}`. Add cohorting only if compile cost is proven high. |
| Reverse index for precise EPS eviction | Complex CDC fan‑out + bookkeeping | Defer. Start with coarse invalidation (evict by `{subject, app}`) + short TTLs. Add reverse index if CDC volumes demand precision. |
| JWS signing of EPS | Key management, signatures, verification | Optional in v1. Keep SHA‑256 pinning of `external_ref` and transport‑level TLS. Add JWS when compliance or multihop trust requires it. |
| zstd everywhere | Operational sprawl | Nice‑to‑have. Gzip is fine to start. Move to zstd when payloads warrant it. |
| Full metric matrix | Dashboard noise | Start minimal: decision latency, cache hit ratio, CDC lag, % degraded. Add others as needed. |

If you cut the above for v1, the design stays lean and still hits goals.

---

## Real risks & mitigations

- **Mode drift (EPS vs Graph‑Eval produce different answers).** 
  - Mitigation: Parity invariants + nightly parity tests on a frozen `graph_snapshot_id`. Fail builds on diffs.
- **CDC lag causes stale grants.** 
  - Mitigation: Modest TTLs in v1 (EPS ≤ 5m, roles/delegation ≤ 60s), alarm on `cdc_invalidation_lag_ms`, and use hard‑evict for revocations.
- **Graph‑Eval tail latency spikes on deep hierarchies.** 
  - Mitigation: Enforce query bounds (`max_traversal_depth`, `max_expansions`, `timeout_ms`) and instrument p95/p99. Deny on timeout.
- **Too many moving parts at launch.** 
  - Mitigation: Ship EPS‑only first. Add Graph‑Eval for one pilot app. Roll the rest later.

### Go / No-Go checklist
- [ ] `fetch_eps` implemented with `If-None-Match` and JWS signatures.
- [ ] Redis L2 keys + reverse index in place; TTLs tuned; tenant prefixes enforced.
- [ ] CDC subscribers deployed; `cdc_invalidation_lag_ms` p99 ≤ 2 s sustained.
- [ ] Shadow run: ≥ 95% traffic, 0 decision diffs; all diffs triaged.
- [ ] Deny-overrides/precedence invariants covered by unit/property tests (≥ 1k cases).
- [ ] Delegation binding tests (JKT mismatch/revoke/expire) green; LKG disabled where required.
- [ ] LKG encrypted and gated by `max_staleness_sec`.
- [ ] Decision receipts include `eps_etag`, `graph_snapshot_id`, `policy_refs[]`, `degraded`.

### Next steps (1–2 sprints)
1. Implement EPS compiler in the PIP (cohort + overlay), add ETag/JWS, and zstd compression; profile compile times.
2. Add Redis L2 adapter and reverse index maintenance; deploy precise CDC invalidation handlers.
3. Wire PDP to `fetch_eps` with L1/L2/LKG, boundary checks, degraded-mode policy, and decision receipts.
4. Run shadow mode, measure p99 latencies and hit ratios; fix parity gaps; roll into dual then clean mode under flags.

- Strong direction; the design now specifies EPS contract, precedence, caching/CDC (with schemas), revocation fast-path/LKG behavior, security (hash/signing), SLOs, tests, a Go/No-Go checklist, and concrete next steps—building directly on `membership_service_pip.py` without changing the client API.

---

## Dual evaluation modes (EPS vs Graph-Eval) to support RBAC RTR and PBAC/AppRights

We add a second, optional execution path for apps with very large resource graphs and rich inheritance that prefer on-graph evaluation instead of precompiled EPS bundles. The PDP remains free of direct Neo4j calls in both modes.

### Mode overview

- **Mode A: EPS (default)**
  - PIP builds/returns Effective Policy Set (compiled YAML/DSL → AST) per `{subject, app}`.
  - Best when policy-driven ABAC dominates; minimal per-request I/O; strongest reproducibility via EPS etags and provenance.

- **Mode B: Graph-Eval (evaluate_on_graph)**
  - PIP forwards a normalized evaluation request to Membership Service, which runs parameterized Cypher for RBAC (RTR), PBAC/AppRights, inheritance, and delegation gating, then returns a decision envelope.
  - Best when the application owns millions of resources with deep hierarchies and relies on RTR/AppRights, where traversals are natural and cheap under indexes.

Selection (per app/tenant/endpoint) via config/flag:

```yaml
evaluation:
  mode: eps | graph      # default eps
  # Optional per-application overrides
  per_app:
    sharepoint-prod: graph
    jira-prod: eps
flags:
  GRAPH_EVAL_ENABLED: true
```

### PDP ⇄ PIP contract: evaluate_on_graph

HTTP (via PIP to Membership Service): `POST /authz/v1/evaluate_on_graph`

Request (single):
```json
{
  "application_id": "sharepoint-prod",
  "subject": { "id": "auth:identity:tenant:user42", "labels": ["Person"] },
  "resource": { "id": "doc:tenant:12345", "type": "document" },
  "action":   { "name": "read" },
  "context":  { "attributes": { "country": "BE", "risk_score": 12 } },
  "options": {
    "model": ["RBAC_RTR", "PBAC_APP_RIGHTS"],
    "inheritance": { "mode": "location|parent|none" },
    "deny_overrides": true,
    "trace": true
  }
}
```

Response (single):
```json
{
  "decision": "PERMIT",
  "obligations": [ { "id": "audit_log", "attrs": { "level": "info" } } ],
  "matched_rules": [ { "model": "RBAC_RTR", "rtr": "MailboxEditor", "scope": "location:Brussels" } ],
  "constraints": { "budget_remaining": 5000 },
  "trace": { "took_ms": 7 },
  "provenance": { "graph_snapshot_id": "g-170622-abc123" },
  "result_type": "success"  
}
```

Batch uses `envelopes: []` → `decisions: []` with preserved order.

### RBAC (RTR) and PBAC/AppRights algorithms (service-side)

- RBAC RTR: subject → containers via `MEMBER_OF*`; check `HAS_RTR` (direct) and `HAS_RTR_AT` combined with `LOCATED_IN*` (bounded). RTR → operation via `INCLUDES_OP`.
- PBAC/AppRights: `HAS_APP_RIGHT` (identity/container) joins; optional `AppRole → AppRight`; JSON field-type predicates via safe UDFs/projections.
- Delegation gating: verify `DELEGATES_TO` (status/expiry/service_id), return `capabilities` and `constraints`; PDP enforces capability match and surfaces constraints.

### Precedence & boundary (both modes)

Keep the same precedence table (edge 10 < user 30 < group/org 40 < application 50 < domain-env 70 < domain-shared 80 < global 100) and deny-overrides within the same level. Every rule/result carries `application_id`; PDP enforces boundary equality to the request `application_id` (or `global`).

### Caching (graph-eval mode)

The graph-eval mode works without caches; for scale:
- PDP L1 (optional): `authz:{tenant}:{subject}:{resource}:{action}:{app}` → decision, TTL 5–15s. Bypass on OBO high-risk flows.
- Membership Service L2 (Redis, optional): `roles:{subject}`, `resource:ancestors:{rid}`, `deleg:{from}:{to}:{service}:{jkt}` (≤ 60s). Invalidated precisely via CDC (`identities.relations`, `policy.refs`, `delegation.events`).

### SLOs (graph-eval mode)

- PDP cached p99 ≤ 5–8 ms.
- Cold single decision (one hop PDP→Service) p99 ≤ 15–25 ms on typical graphs.
- CDC e2e p99 ≤ 2 s; same degraded/deny policy as EPS mode.

### PDP changes (dual-mode)

- Add mode selector (`evaluation.mode` / per-app override).
- If `mode == graph`, call `pip.evaluate_on_graph(...)` instead of `fetch_eps`.
- Continue to verify delegation via `pip.verify_delegation(...)`; do not use LKG for delegation context.
- Receipts always include `graph_snapshot_id`; EPS mode also includes `eps_etag` and provenance.

### PIP changes (dual-mode)

- Add client method:
```python
class MembershipServicePIP(PIPPlugin):
    async def evaluate_on_graph(self, request: dict) -> dict: ...
```
- Reuse existing auth, retries, circuit breakers, and small in-process cache for idempotent bursts.
- Keep `fetch_eps` supported; both methods coexist.

### Rollout (dual-mode)

1) Shadow: PDP computes legacy vs graph-eval (or EPS) and diffs decisions (no user impact).
2) Dual: Use selected mode; keep fallback path behind flags.
3) Clean: Freeze on chosen mode per app; keep flags for emergency fallback.

Feature flags:

```
GRAPH_EVAL_ENABLED
USE_EPS
PDP_L1_CACHE_ENABLED
LOW_RISK_CONSTRAINED_PERMIT_ENABLED
```

### Test plan additions (graph-eval)

- Golden RBAC RTR cases: direct, location-scoped, relative scopes; large location trees.
- PBAC/AppRights cases with JSON field filters and role→right indirection.
- Mixed RBAC+PBAC precedence and deny-overrides.
- Scale tests: resource trees 10–20M nodes; traversal depth bounds verified; p99 under targets.

---

This dual-mode design preserves the EPS strengths for ABAC-heavy scenarios and adds a pragmatic graph-evaluation path that cleanly supports RBAC RTR and PBAC/AppRights at massive resource scales—all without the PDP talking to Neo4j directly.

---

## Parity invariants (EPS vs Graph‑Eval)

To prevent drift between modes, the following must hold (and be tested):

1. Given the same `{subject, app, resource, action, context}` and a fixed `graph_snapshot_id`, EPS and Graph‑Eval produce identical `(decision, obligations, constraints)`.
2. Deny‑overrides applies within a precedence level; across levels the lower precedence score wins.
3. Only rules/policies with `application_id ∈ {request_app, global}` may contribute.

Add a parity test suite that runs both modes and diffs outputs; diffs are triaged before rollout.

---

## Required indices & bounds (graph service)

Constraints:
- `(:Identity {id})` unique, `(:Resource {id})` unique, `(:RTR {id})` unique, `(:Policy {id})` unique.

Indexes / query anchors:
- Node lookups: `Resource.id`, `Identity.id`, optionally `Location.id`.
- Relationship properties: `[:HAS_RTR(rtr)]`, `[:HAS_RTR_AT(rtr)]`.
- Traversal bounds: `LOCATED_IN*0..max_depth` where `max_depth ≤ options.max_traversal_depth`.
- Query style: anchor by id → traverse; avoid label scans.

---

## Obligations sourcing in Graph‑Eval

When evaluating on graph:
- Obligations are sourced via a **precompiled obligations map** keyed by `policy_id@rev` in Membership Service (Phase 1). The map is refreshed on policy publish and CDC; queries never fetch YAML at decision time.
- If RTR/AppRights carry obligations on edges/nodes, union obligations within the winning precedence level; if deny wins at that level, apply deny obligations (if defined) and suppress lower-level obligations.

---

## Failure policy (Graph‑Eval unavailability)

- Default: **deny** on timeouts (408/504) or 5xx.
- Optional: low‑risk constrained permit behind a feature flag; never when delegation is present; audit with `degraded=true` receipt.
- No LKG usage for graph‑eval decisions; re‑try with backoff or fail per above.

---

## User Experience and UI plan (pdp_ui)

### UX goals and personas
- Policy authors: author, lint, preview, and test policies; see effective results and inheritance.
- Application owners: edit app config (catalog/validation), choose EPS vs Graph‑Eval, view effective policies.
- Domain admins: manage domain policies; understand cross‑environment inheritance and impacts.
- Support/ops: debug decisions (traces, matched rules), monitor caches and CDC freshness.

### Information architecture
1) Hierarchy: Global → Domains → Applications (inheritance explorer, counts)
2) Policies: Per‑level CRUD + search; YAML viewer/editor with ETag + schema validation
3) Effective view: Application effective policies + inheritance annotations
4) Evaluation/diagnostics: Decision runner with traces; batch testing; optional parity diff (EPS vs Graph‑Eval)
5) Delegations: Verify/show capabilities/constraints; revoke
6) Operational insights: Cache/CDC metrics, SLO dashboards, recent errors

### Backend → UI mapping
- Global policies: `GET /api/v1/policies/global` (list), `GET/PUT/DELETE /api/v1/policies/global/{id}`, `GET .../impact-analysis`
- Domain policies: `GET /api/v1/domains`, `GET /api/v1/domains/{id}/config`, `GET/POST /api/v1/domains/{id}/policies`, `GET/PUT/DELETE /api/v1/domains/{id}/policies/{pid}`
- Applications (admin): `GET /api/authz/applications`, `GET/PUT/POST/DELETE /api/authz/applications/{app_id}`, `GET /api/authz/applications/{app_id}/catalog`
- Application effective: `GET /access/v1/applications/{app_id}/effective-policies`, `GET /access/v1/applications/{app_id}/inheritance`
- Hierarchy views/search: `GET /api/v1/hierarchy`, `GET /api/v1/hierarchy/{app_id}`, `GET /api/v1/hierarchy/search/policies`
- Policy schema/authoring: `GET /schemas/policy`, `GET /schemas/policy-authoring`

Graph‑Eval requests are served by Membership Service; server‑side config enforces traversal bounds (`max_traversal_depth`), expansion limits, and timeouts. UI continues to use PDP for policy CRUD/effective/inheritance and local test runs. A PDP proxy to `evaluate_on_graph` can be added later if required.

### UI pages to enhance/build (pdp_ui)
- AdminApplicationsPage / AdminApplicationDetailPage: add mode selector (EPS/Graph‑Eval); show catalog/validation; tabs for Effective Policies and Inheritance.
- AdminDomainsPage / AdminDomainInheritancePage: domain policy CRUD; inheritance visualization; impacted apps link.
- Global policy list/detail: impact analysis tree; dependents.
- PolicyEditorPage: schema‑validated editing with ETag; inheritance level badge; authoring helpers/data sources.
- PolicyVisualizerPage: show matched rules/obligations; jump to source.
- InheritanceExplorerPage: visualize chains via `/api/v1/hierarchy/{app_id}`.
- AdminDecisionsPage / BatchTestPage: decision runner (trace, matched rules, obligations, constraints, `graph_snapshot_id`); optional parity diff.
- PIPManagerPage / AdminPipsPage: config + health visibility; test delegation verify.
- Labs: cacheMetrics (hit ratio, CDC lag), delegation sandbox (verify with `jkt`).

### Components and store updates
- New/updated slices in `src/store`: applications, effectivePolicies, domains, policies, diagnostics, metrics.
- Shared components: ETag‑aware YAML editor; InheritanceBadge; ImpactTree; DecisionTrace.

### UX patterns
- Progressive disclosure; safe editing (ETag/undo); explainability (receipts with `graph_snapshot_id`/`eps_etag`); batch flows; search‑first.

### Phased rollout
- Phase 1 (EPS‑only): effective/inheritance tabs, policy CRUD + schema validation, decision runner, basic metrics (latency, cache hits, CDC lag).
- Phase 2 (Graph‑Eval pilot): per‑app mode selector; decision runner shows `graph_snapshot_id`; optional parity diff; delegation sandbox; impact analysis.
- Phase 3 (ops polish): cache/CDC dashboards; improved visualizer; dynamic authoring data sources.

### Non‑goals v1
- Automated parity diff UI (keep in CI first); live graph topology beyond inheritance/dependents lists.

---

### Graph visualization (Cytoscape) details & data shape

- Library: `react-cytoscapejs` with `fcose` (default) and `dagre` for tree‑like layouts.
- Styling: node color by type (Identity, Resource, RTR, Policy, Group, Location); edge color by relationship; arrows for `DELEGATES_TO`, `POLICY_REF`.
- Guardrails: server depth ≤ 2 by default, element limit ≤ 500; client warns >1500 elements before render; keyboard (F fit, P pin, E expand, / search); tabular fallback for A11y.

Data shape (ego endpoint):
```json
{
  "nodes": [
    {"id":"auth:identity:tenant:user42","type":"Identity","label":"user42","props":{"labels":["Person"]}},
    {"id":"doc:tenant:12345","type":"Resource","label":"Document 12345","props":{"resource_type":"document"}}
  ],
  "edges": [
    {"id":"e1","type":"HAS_RTR","from":"auth:identity:tenant:user42","to":"rtr:MailboxEditor","props":{"scope":"location:Brussels"}},
    {"id":"e2","type":"POLICY_REF","from":"auth:identity:tenant:user42","to":"policy:sharepoint-document-access@3","props":{"rev":3}}
  ],
  "bounds": {"depth":1,"limit":200},
  "snapshot":"g-170622-abc123"
}
```

Delight features: multi‑select compare in Effective Policies, inline provenance copy, deep links everywhere, “Reproduce decision” button to prefill Decision Lab.