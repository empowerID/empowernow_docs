## Param Schema + Orchestrator: A single source of truth for safe, guided execution

### Why this exists
- Reduce bespoke UI/agent code per command by describing inputs once.
- Make execution safer: defaults, normalization, validation, and redaction are applied consistently before side‑effects.
- Enable zero‑SDK automation: the same schema powers the UI, MCP prompts, and the Orchestrator.

### Core ideas
- Param Schema lives alongside each system command definition and describes inputs semantically.
- The Orchestrator reads that schema to perform metadata‑driven slot‑filling before any ACTION runs.
- If inputs are missing/invalid, the engine synthesizes a deterministic FORM and enters WAITING; the client fills and resumes.

---

## Schema model and x‑fields

You declare a `param_schema` for each command (YAML). Supported fields:

- type: JSON Schema type (string, number, integer, boolean, object, array)
- description: Human‑readable purpose
- items: JSON Schema for array elements (if type = array)

Extended x‑fields (LLM/UI/engine hints):
- x-elicit: The question to ask when the field is missing (e.g., "Which user?").
- x-suggest: How to fetch choices, using tools.
  - tool: tool name (from `config/tools.yaml`)
  - args: template arguments (Jinja expressions allowed)
  - map: label/value mapping, e.g., `{ label: "displayName", value: "id" }`
- x-normalize: How to canonicalize an input (tool + args). Returns a canonical value.
- x-compose / x-decompose: Build/break complex fields (e.g., a URI) from parts.
- x-default: Default value (may reference env or other fields).
- x-redact / x-pii: Redaction policy for logs/AI context/examples.
- x-rbac-scope: Intended scope for authz hints.

Example (Auth0 – add roles):
```yaml
commands:
  AddRolesToUser:
    endpoint: "/users/{{ SystemIdentifier }}/roles"
    method: POST
    body_format: json
    required_params: ["SystemIdentifier", "membersToAdd"]
    param_schema:
      SystemIdentifier:
        type: string
        description: Auth0 user id
        x-elicit: "Which Auth0 user?"
        x-suggest:
          - tool: "auth0.user.search"
            args: { q: "{{ query }}" }
            map: { label: "email", value: "user_id" }
      membersToAdd:
        type: array
        items: { type: string }
        description: Array of role IDs
        x-elicit: "Which roles should be added?"
        x-suggest:
          - tool: "auth0.group.search"
            args: { q: "{{ query }}" }
            map: { label: "name", value: "id" }
    body:
      roles: "{{ membersToAdd | tojson }} asjsonobject"
```

---

## Orchestrator pipeline (before ACTION execution)

1) Apply x-default: Fill implied values.
2) x-compose / x-decompose: Harmonize compound values (e.g., build `uri` from parts).
3) x-normalize: Call normalization tools to canonicalize (e.g., secret URIs, user IDs).
4) Validate: Enforce types and required fields (JSON Schema).
5) If missing/invalid: build a FORM from `param_schema` → WAITING.

The Orchestrator runs again after the form submit to re‑normalize and validate before the ACTION executes.

---

## Expressions and lookups

Where you can use expressions:
- `args` in x-suggest / x-normalize: Jinja templates; common placeholders:
  - `{{ query }}`: user’s free‑text query from UI/agent (autocomplete input)
  - `{{ env }}`: environment keys (via config loader)
  - Any previously resolved field: `{{ SystemIdentifier }}`
- `x-compose`: Jinja template combining parts: `"{{provider}}://{{mount}}/{{path}}#{{fragment}}"`

Lookups with x-suggest:
- Backed by tools listed in `ServiceConfigs/CRUDService/config/tools.yaml`.
- Each tool defines an input schema; the Orchestrator and UI send `args` rendered from the current context.
- The tool returns a list or object; `map.label` and `map.value` pick visible text and bound value.
- Best practice: implement pagination on suggest tools; add `min_chars` gating in the UI.

Normalization with x-normalize:
- Tools like `secrets.catalog.normalize` return a canonical representation.
- Treat as side‑effect‑free; cache within a run for latency (the Orchestrator/clients can cache calls).

Redaction:
- `x-redact: true` ensures values are masked in AI examples, logs, and any WAITING payload examples. The engine applies redaction centrally.

---

## How UI and agents use the schema

UI (forms):
- Renders deterministic form inputs (type, required, labels) from `param_schema`.
- Uses x-suggest to drive autocompletes/dropdowns.
- Uses x-normalize to canonicalize values before submit.

MCP prompts & LLM agents:
- Prompts read `param_schema` to ask the right questions (x-elicit) and call suggest/normalize tools to slot‑fill.
- Agents generate a Plan‑IR or directly call `workflow.start` / `workflow.resume` with resolved params.
- The WAITING response includes `mcp_request_format` (facade) for one‑click execution from agents.

Engine (orchestrator):
- Applies the same defaults/normalize/validate pipeline regardless of client.
- If anything is missing/invalid, synthesizes a FORM USER_INTERACTION → WAITING.

---

## Deciding what to add for a command

1) Identify inputs by role:
- Identifiers (user, group, system, path): add x-suggest + x-normalize.
- Enumerations: add x-suggest or `enum` in schema.
- Compound values (URIs, DNs): add x-decompose/x-compose.
- Sensitive (secrets, tokens): add x-redact.
- Defaults (env/mount/path): add x-default.

2) Write x-elicit for each required input: short and role‑appropriate.

3) Map suggest tools:
- Prefer existing tools (e.g., `entra.user.search`, `auth0.user.search`, `secrets.catalog.keys`).
- Keep `args` minimal (e.g., `q`, `prefix`) and use `map` to shape label/value.

4) Add x-normalize for anything with multiple accepted formats.

5) Validate with JSON Schema (types, required, length, pattern where needed).

6) Redaction & RBAC:
- Use `x-redact` for secrets/PII fields.
- Optionally set `x-rbac-scope` to hint required scopes for PDP/UI.

---

## End‑to‑end: Orchestrator + WAITING

1) Client starts a workflow with partial params.
2) Orchestrator preflight applies defaults/normalize/validate.
3) If missing/invalid → engine emits WAITING with a synthesized FORM.
4) Client fills fields (UI uses suggest/normalize; agent uses MCP tools guided by schema).
5) Client calls `/workflow/resume` with `state_version` + `idempotency_key`.
6) Orchestrator runs again; if valid → ACTION executes.

---

## How prompts use it

Prompts consult the schema to:
- Ask precise questions (from x-elicit) rather than open‑ended text.
- Call x-suggest tools to fetch candidate values (labels + IDs).
- Call x-normalize to canonicalize raw inputs (URIs/IDs) before emitting Plan‑IR or calling the workflow.

Example prompt behavior:
1) "Which Auth0 user?" → call `auth0.user.search` with `q=...` → present top 5 → bind `SystemIdentifier`.
2) "Which roles?" → call `auth0.group.search` → bind `membersToAdd`.
3) Optionally call normalize → verify → emit a Plan‑IR step (`tool`) or start/resume the workflow.

---

## Operational guidance

Rollout:
- Start with 2–3 systems and annotate 3–5 top commands each (create/update, membership add/remove, reset password).
- Add tests that:
  - Confirm `param_schema` exists for targeted commands
  - Orchestrator synthesizes a FORM when required fields are missing
  - Suggest/normalize tools respond as expected (mock in tests)
  - Redaction snapshots don’t leak secrets

Pitfalls:
- Over‑fetching in x-suggest; prefer `min_chars` gating in UI and page results.
- Missing redaction on sensitive fields.
- Inconsistent normalized shapes; define canonical forms in one place (tool/contract) and reuse.

Telemetry:
- Count synthesized forms (orchestrator loop), suggest/normalize latency, validation failures, and re‑submission success rate.

---

## Quick checklist per command

- [ ] Required fields enumerated and typed
- [ ] x-elicit for each required field
- [ ] x-suggest with tool + args + map for IDs/enums
- [ ] x-normalize where multiple formats exist
- [ ] x-defaults for common cases
- [ ] x-compose/x-decompose for compound values (if applicable)
- [ ] x-redact/x-pii on sensitive
- [ ] JSON Schema validation sufficient (pattern/min/max/enum)


