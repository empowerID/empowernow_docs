## Explainability + Orchestrator Cheat Sheet (engineers + PMs)

Use this page when you need the “just do it” details.

### 1) WAITING contract: the fields that matter
- result.required_action: what to do (approval/form/LLM)
- result.request_format:
  - method: POST
  - url: /workflow/resume/{task_id}
  - headers: include `If-Match: <state_version>`
  - body:
    - task_id
    - data or decision
    - state_version
    - idempotency_key (client‑chosen)
  - fingerprint: stable hash of intent (audit join)
- result.state_version: concurrency token
- result.contract_version: "1.0"
- result.mcp_request_format: `tool: workflow.resume`, required args mirror body

### 2) Resume calls (curl)
```bash
# WRONG: missing If-Match and no body.state_version (will be rejected)
curl -X POST /workflow/resume/ABC -H 'Content-Type: application/json' -d '{"data":{}}'

# RIGHT: include If-Match and idempotency_key
curl -X POST /workflow/resume/ABC \
  -H 'Content-Type: application/json' \
  -H 'If-Match: 7' \
  -d '{"data":{},"state_version":7,"idempotency_key":"wf:…:node:7:actor"}'
```

### 3) MCP equivalents
- Use `mcp_request_format` from the WAITING payload:
```json
{ "tool": "workflow.resume",
  "args": { "task_id": "…", "state_version": 7, "idempotency_key": "…", "decision|data": "…" } }
```

Also available (schema‑as‑API helpers):
- `systems.describe_command` → returns `required_params` + `param_schema`
- `workflow.schema_start` → fetch describe, return `missing`, optionally `start` when complete
- Suggesters: `auth0.user.search`, `auth0.group.search`, `entra.user.search`, `entra.group.search`

### 4) Error semantics
- 412 Precondition Failed (stale ETag): you sent an old `If-Match: <state_version>` header. Refetch status and retry with the new version.
- 409 Conflict (stale body.state_version): you used an old version in the body. Refetch status and retry.
- Idempotent replay: same `idempotency_key` → server returns the same response; no duplicate side‑effects.
- Errors are RFC‑7807 Problem Details: `{type,title,detail,status,correlation_id,fingerprint?}`

### 5) Orchestrator preflight (what it actually does)
1) Apply x-default
2) x-compose/x-decompose
3) x-normalize via tools (safe; cacheable)
4) JSON‑Schema validate
5) If missing/invalid → auto‑FORM WAITING (UI and agents fill fields and resume)

Generic normalize fallback
- If a declared normalize tool cannot be executed or returns no value, the server applies a provider‑agnostic fallback: inputs containing `://` are treated as canonical; otherwise, when `args.default_prefix` (or `args.prefix`) is present in the `x-normalize` declaration, it is prepended to the raw value; else the original value is echoed unchanged.

### 6) `param_schema` quick rules
- Identifiers (user/group/URI/DN): add `x-suggest` and `x-normalize`
- Lists/enums: `items` + suggest or `enum`
- Compound: `x-compose`/`x-decompose`
- Defaults: `x-default`
- Sensitive: `x-redact` (and mark PII when applicable)
- Scope hint: `x-rbac-scope`

### 7) Minimal example (Auth0 add roles)
```yaml
param_schema:
  SystemIdentifier:
    type: string
    x-elicit: "Which Auth0 user?"
    x-suggest:
      - tool: auth0.user.search
        args: { q: "{{ query }}" }
        map: { label: email, value: user_id }
  membersToAdd:
    type: array
    items: { type: string }
    x-elicit: "Which roles?"
    x-suggest:
      - tool: auth0.group.search
        args: { q: "{{ query }}" }
        map: { label: name, value: id }
```

### 8) What to log / measure
- Include `correlation_id`, `fingerprint`, `state_version`, `idempotency_key` in structured logs.
- Metrics to watch: `workflow_resume_conflict_total`, `workflow_resume_idempotent_replay_total`, orchestrator forms created, p95 resume latency.
  - Convenience KPIs: `GET /observability/kpis`; Prometheus: `GET /metrics`

### 9) FAQ
- Q: Can an agent bypass safety?
  - A: No. All side‑effects execute in ACTION nodes through the engine.
- Q: Why do I keep getting 409/412?
  - A: Stale `state_version`. Fetch status, read the latest WAITING, retry with fresh `If‑Match` or body `state_version`.
- Q: Where are secrets masked?
  - A: `x-redact` enforces masking in examples and logs centrally.



