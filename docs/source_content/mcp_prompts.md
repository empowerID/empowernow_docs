### Executive summary
- Prompts: human-triggered planners that return messages (and a JSON “Plan IR”); no execution.
- Workflows: deterministic, auditable executors that orchestrate your CRUD/Graph tools.
- Best practice: prompts decide and collect consent; workflows do. A tiny Plan IR bridges them so planning stays flexible and execution stays governed.

### Final design (how it works end-to-end)
- Prompt catalog (YAML-backed)
  - Location: `ServiceConfigs/CRUDService/config/prompts/*.yaml`
  - Each prompt defines name/title/description, arguments, and 1–N message templates.
  - The gateway registers them as MCP prompts; clients can discover via `prompts/list` and render via `prompts/get`.
  - Admin endpoints: list/detail/save/delete/reload are exposed; see `MCP_PROMPTS_GUIDE.md` for the SPA and APIs.

- Plan IR (the contract between prompts and execution)
  - The prompt instructs the model to output a strictly-validated plan, not prose.
  - Minimal schema (stable, testable):
```json
{
  "version": "plan/v1",
  "steps": [
    {
      "kind": "workflow|tool|approve|wait",
      "ref": "av_ad_addomain_create_user",
      "version": "1.0.0",
      "params": { "FirstName": "Jane", "LastName": "Doe", "..." : "..." },
      "allow_tags": ["account","create","ad"],
      "dry_run": true
    }
  ],
  "meta": { "prompt_id": "idp.identity.onboard@1.0.0", "tenant": "cont-av" }
}
```

- Compiler + executor (in the gateway)
  - Validate: ensure Plan IR shape, allow-listed steps, and per-workflow input schemas pass.
  - Resolve: map step refs/tags to concrete MCP workflow tools (you already expose workflows as tools).
  - Simulate (optional, deterministic-first): run dry-run or “simulate” variants to get diffs and policy checks.
  - Approve: if the plan includes an `approve` step or UI requires consent, pause for explicit confirmation.
  - Execute: call the referenced workflow/tool steps in order; propagate `dry_run=false` once approved.
  - Receipt: persist a run receipt linking plan → workflow runs for audit and retries.
  - Views: prompts participate in virtual views; `prompts/list` and `prompts/get` are filter-scoped by provider/tags. See `mcp_virtual_views.md`.

- Safety and UX
  - Elicitation: if arguments are missing/invalid (e.g., AD DN), the server asks the client to collect structured inputs.
  - Allow-lists: each prompt declares allowed tags or specific workflows/tools; compiler enforces this.
  - Idempotency: use workflow inputs to derive idempotency keys; avoid double-creates.
  - Observability: log `{prompt_id, version, tenant, plan_hash, outcome}`; enable A/B variants and `prompts/list_changed`.

### What it offers (why it’s useful)
- Predictability where it matters: workflows stay deterministic and auditable.
- Flexibility where you want it: prompts can route by tenant/provider, embed policy context, and gather missing inputs.
- Clear human-in-the-loop: prompts plan and explain; users approve; workflows execute safely.
- Testability: Plan IR is small and easy to snapshot-test and validate in CI.

### Real-world scenarios mapped to your workflows
- AD user creation (`av_ad_addomain_create_user`)
  - Prompt: identity.onboard.ad
  - Output plan:
    - Step 1: `approve` (“Create AD account for Jane Doe in OU=People?”)
    - Step 2: `workflow` ref=`av_ad_addomain_create_user` version=`1.0.0` with mapped inputs (FirstName, DN, etc.) `dry_run:true`
    - Step 3 (optional): `tool` add to groups/license (if policy requires)
  - Flow: simulate → explain risks (password/OU policy) → approve → execute.

- Entra group → OpenLDAP import + set password + email (`av_entraid_contractors_import_group_and_users_to_openldap_set_password`)
  - Prompt: group.sync_offline_access
  - Output plan:
    - Step 1: `approve` (“Import N users; send email with temp password?”)
    - Step 2: `workflow` ref=that long import workflow (dry_run first)
    - Step 3: optional `wait` (windowing), then execute.

- Add user to group (`av_entraid_contractors_users_add_user_to_group`)
  - Prompt: group.add_member
  - Output plan:
    - Step 1: `workflow` ref=`av_entraid_contractors_users_add_user_to_group` with `SystemIdentifier`, `GroupSystemIdentifier`
    - Step 2: `approve` if group is sensitive; else just run.

- View group users (`av_entraid_ocg_view_group_users`)
  - Prompt: group.view_users
  - Output: either a plan with a read-only workflow step or directly include results as an embedded resource message.

### How prompts and workflows cooperate (simple mental model)
- Prompts decide:
  - Gather/normalize inputs (email/UPN/DN).
  - Choose provider(s) and workflows/tools by tags (e.g., ["account","create","entra"]).
  - Produce a strict Plan IR and explain the intent/risks.
- Workflows do:
  - Deterministic orchestration of your system definition commands (MCP tools).
  - Pre/post validations, logging, compensation, and idempotency.
- The gateway glues them:
  - Validates the plan, simulates if configured, gates approval, and executes.
  - Records a receipt for audit and metrics.

### Modes you can enable without overengineering
- Deterministic-first (recommended default for risky ops)
  - Always simulate workflow(s) first; prompt explains and asks for consent; then execute.
- Prompt-first (for exploratory/triage)
  - Prompt drafts a plan; compiler just validates and runs low-risk steps.
- Prompt-wrapped workflow (for “explain before run” UX)
  - Prompt renders a concise summary and a dry-run diff for a single known workflow.

### Authoring parity and operations
- Author prompts in YAML in `ServiceConfigs/CRUDService/config/prompts/*.yaml`; no Python required.
- Hot-reload prompts and send `prompts/list_changed` so clients refresh.
- Version prompts (`prompt_id@semver`) and workflows (`version: "1.0.0"`) explicitly.
- Validate Plan IR and workflow input schemas in CI with fixtures.
 - Admin flow: browse/test/create via `/prompts` SPA; focused editing at `/admin/prompt/:name`; API-driven updates at `/api/crud/configs/prompts/{name}`; reload via `/api/crud/admin/prompts/reload`.

### Further reading
- End-to-end walkthrough: see `docs/mcp_prompts_e2e.md` (prompt → plan → workflow → UI mapping).

### Virtual servers & scoping
- Prompts are first-class MCP features, alongside tools and resources. They are registered on the CRUDService MCP gateway and can be exposed through "virtual servers" (filtered views) defined in `ServiceConfigs/CRUDService/config/mcp_virtual_servers.yaml`.
- Each prompt carries metadata for filtering, analogous to tools/resources:
  - `source: "prompt"`
  - `provider`: e.g., `entra`, `ad`, `auth0`
  - `instance/tenant`: from the system’s `mcpInstance` (when applicable)
  - `tags`: domain hints like `account`, `group`, `onboard`, `license`
- Virtual servers include prompts whose metadata matches the view’s `filters`:
  - A dedicated prompts catalog (optional):
    ```yaml
    - name: "prompts"
      path_prefix: "/prompts"
      filters:
        source: ["prompt"]
    ```
  - Existing views can include prompts by reusing provider/source filters. For example, in a workflows-only view you might keep `source: ["workflow"]` to exclude prompts, while in an Entra view you can include both systems and prompts:
```yaml
    - name: "entra"
      path_prefix: "/entra"
      filters:
        source: ["system", "prompt"]
        provider: ["entra"]
    ```
- Discovery & use:
  - Clients target a view endpoint (e.g., `/mcp/entra`) and call `prompts/list` to discover only the prompts in scope for that view, then `prompts/get` to render with arguments.
  - The same view’s tools/resources remain filter-scoped, so prompt outputs (Plan IR) reference workflows/tools that are also visible in that view.
- Hot-reload parity:
  - When prompt YAML files change, re-register and emit `notifications/prompts/list_changed` so virtual views reflect updates without a restart.
 - BFF proxy and transport: `POST /api/crud/mcp/{view}/jsonrpc` for JSON‑RPC and `GET /api/crud/mcp/{view}/jsonrpc` SSE bridge for streamable clients.

### Agent UI integration (using prompts)
- Where to use prompts: any MCP-capable agent client (Cursor/Claude Desktop/OpenAI Agents SDK) or our own Agent UI (WS/HTTP).
- Flow in the UI:
  1. Discover prompts via MCP (optionally through a virtual view) with `prompts/list`.
  2. Render a selected prompt with arguments via `prompts/get` → returns `messages[]`.
  3. Map to our runner:
     - systemPrompt = messages[0].content
     - userInput = join(messages[1:].content, "\n\n")
     - outputSchema (optional) = Plan IR schema for validation
  4. Run through existing channels:
     - WebSocket: `openAgentWs({ systemPrompt, userInput, outputSchema })`
     - HTTP: `POST /agents/{name}/execute` with `prompt` and `output_schema` if needed
  5. Parse model output as Plan IR → show Approve → execute referenced workflows/tools (visible in the same virtual view).
- Virtual servers: prompts are filter-scoped like tools/resources. A dedicated `/mcp/prompts` view can list only prompts; `/mcp/entra` can list Entra-scoped prompts+tools.

### To-Do: Agent prompt support (implementation tasks)
- Gateway: load YAML prompts, register as MCP prompts, tag metadata (source="prompt", provider, instance, tags).
- Gateway: hot-reload prompts and emit `notifications/prompts/list_changed`.
- Gateway: Plan IR JSON Schema + validator; simple compiler (resolve refs/tags → workflow/tool; enforce allow-lists; optional simulate/dry-run).
- Gateway: optional proxy endpoints to surface `prompts/list` and `prompts/get` to the UI (if not calling MCP directly).
- UI (Agent): add prompt picker and argument form; call `prompts/get`; set `systemPrompt`/`userInput`/`outputSchema` in WS/HTTP runners.
- UI (Agent): show Plan IR, validate against schema, collect approval, then invoke steps using CRUDService MCP tools/workflows.
- UI: add virtual-view selector so discovery/execution are tenant/provider-scoped.
- Observability: log `{prompt_id, version, tenant, plan_hash, outcome}` and link plan → workflow run receipts.
- Safety: per-prompt allow-list, parameter validation; surface simulate/dry-run by default for risky ops.
### Example: compact Plan IR from an onboarding prompt
```json
{
  "version": "plan/v1",
  "meta": { "prompt_id": "idp.identity.onboard@1.0.0", "tenant": "cont-av" },
  "steps": [
    { "kind": "approve", "id": "gate", "params": { "message": "Create account for Jane Doe?" } },
    { "kind": "workflow", "ref": "av_ad_addomain_create_user", "version": "1.0.0",
      "params": {
        "FirstName":"Jane","LastName":"Doe","LogonName":"jane.doe",
        "UserPrincipalName":"jane.doe@example.com","Name":"Jane Doe",
        "DistinguishedName":"CN=Jane Doe,OU=People,DC=example,DC=com",
        "Password":"Temp$2025!","FriendlyName":"Jane Doe","DisplayName":"Jane Doe",
        "Email":"jane.doe@example.com","JobTitle":"Engineer"
      },
      "allow_tags": ["account","create","ad"], "dry_run": true
    }
  ]
}
```

### Non-goals (to keep it lean)
- Prompts never invoke tools directly.
- No complex DSL in prompt templates; keep logic in compiler/workflows.
- No hidden system messages; prompts return only user/assistant messages.

If you want this wired in, the minimal, pragmatic additions are:
- YAML prompt loader + MCP registration.
- Plan IR validator + simple compiler (resolve by tags → workflow tool, validate inputs, optional simulate, then run).
- One or two prompts (onboard, group.add_member) that emit Plan IR calling your existing workflows.

---

## Engine integration (code-level blueprint)

The following folds prompts into the graph engine as first-class planning/elicitation/approval/repair surfaces while keeping execution deterministic and auditable.

- Core components (shared)
  - `src/engine/plan_ir.py`: typed Plan IR models and `validate_plan_or_raise`. Version: `plan/v1` with `steps[]` of kind `workflow|tool|approve|wait|note|simulate`.
  - `src/engine/plan_runtime.py`: `compile_and_execute_plan(executor, node, plan)` that iterates steps, delegates `workflow` to the workflow runner and `tool` to the command executor, and honors `approve/simulate/wait/note`.
  - `src/mcp/client.py`: tiny MCP prompt client (list/get) used by handlers to fetch prompt messages.

- `src/engine/graph_executor/agent_handler.py` (planner/repair/explainer)
  - New config keys: `prompt_name`, `prompt_args`, `prompt_view`, `output_schema` (e.g., `plan/v1`), `allow_tags`, `simulate_first`, `on_error_repair_prompt`.
  - Flow: render prompt → run agent once to get Plan IR → validate → optionally insert a `simulate` step → call `compile_and_execute_plan` → complete node. Use `allow_tags` to constrain resolution.

- `src/engine/graph_executor/llm_handler.py` (bounded LLM planning)
  - Accept `llm_config.prompt_name/prompt_args/output_schema`.
  - If `output_schema == "plan/v1"`: validate response JSON; store under `step_results` or `auto_execute` via `compile_and_execute_plan`.

- `src/engine/graph_executor/form_handler.py` (elicitation bridge)
  - If a node references a `prompt_name` but lacks a `form_schema`, synthesize a form UI from the prompt’s `arguments` (name/description/required/enum).
  - On submit, re-render the prompt with collected args and (optionally) re-plan to produce a Plan IR.

- `src/engine/graph_executor/approval_handler.py` (justification + consent)
  - Optional `decision_prompt`: summarize scope/diff/risks/rollback before creating the approval task; store summary in task metadata.
  - Optional `post_approval_memo_prompt`: after approvals, generate a short memo (who/why) and store in `step_results`.

- `src/engine/graph_executor/action_handler.py` (deterministic executor)
  - Add an internal action: `system: "_internal"`, `action: "execute_plan"|"simulate_plan"` that accepts `params.plan` and calls `compile_and_execute_plan`.
  - Optional `assist_prompt` to normalize/complete `params` before execution (strict JSON only; no side-effects).
  - Optional `on_error_repair_prompt`: on known, safe error classes (e.g., `entryAlreadyExists`), request a constrained repair micro-plan and execute it under `allow_tags`.

- Observability, safety, idempotency
  - Persist `{prompt_id, version, args_hash, model, plan_hash}` in `node.metadata` and analytics.
  - Enforce per-prompt/step `allow_tags` when resolving tools/workflows; reject out-of-scope steps and request re-plan.
  - Use idempotency keys in create/update actions; prefer dry-run/simulate first for risky ops.

- Example nodes (prompt → plan → execute)

```yaml
# Planner node (LLM-backed) → produces Plan IR
id: plan_onboard
type: USER_INTERACTION
config:
  interaction_type: "llm"
  llm_config:
    prompt_name: "identity.onboard"
    prompt_args:
      email: "{{ in.Email }}"
      targets: ["entra","ad"]
      dry_run: true
    output_schema: "plan/v1"
    auto_execute: false
response_mapping:
  - target: "var.plan"
    expression: "{{ response.assistant_response }}"
edges:
  - to: execute_plan
```

```yaml
# Deterministic execution node for the plan
id: execute_plan
type: ACTION
config:
  system: "_internal"
  object_type: "plan"
  action: "execute_plan"
  params:
    plan: "{{ var.plan }}"
    allow_tags: ["account","create","entra","ad"]
```

- Hygiene notes (quick wins)
  - Deduplicate multiple `_log_event` helpers in handlers; adopt one structured JSON logger.
  - Replace stringified JSON arrays in YAML with real lists (prevents quoting bugs).
  - Add a per-iteration scope (`loop.*`) in FOREACH to avoid var leakage.

## To-Do: Engine integration tasks
- Core
  - Add `plan_ir.py`, `plan_runtime.py`, and a minimal `mcp/client.py`.
- Handlers
  - `agent_handler.py`: support prompt-backed planning; validate Plan IR; simulate-first; call `compile_and_execute_plan`.
  - `llm_handler.py`: accept `prompt_name/prompt_args/output_schema`; handle `plan/v1` with optional `auto_execute`.
  - `form_handler.py`: synthesize forms from prompt `arguments`; re-plan on submit when configured.
  - `approval_handler.py`: integrate `decision_prompt` (pre-approval summary) and `post_approval_memo_prompt`.
  - `action_handler.py`: internal `execute_plan/simulate_plan`; optional `assist_prompt` and `on_error_repair_prompt` hooks.
- Safety/observability
  - Enforce `allow_tags` per prompt/step; add idempotency keys on create/update; persist plan/prompt receipts.