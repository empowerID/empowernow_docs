### Real-world end-to-end: rotate a production DB password using MCP + graph workflows

Context
- Actors: SRE asks an MCP agent (e.g., Claude Desktop) connected to our CRUD Service MCP server.
- Capabilities exposed:
  - MCP Tools: `workflow.start`, `workflow.resume`, `secrets.catalog.search`, `secrets.catalog.normalize`, `secrets.catalog.mounts`.
  - Prompts: `secrets.create_or_update` (smart URI), internal “approval summary” prompt, optional plan prompts.
  - System definitions: `systems/secrets.yaml` with `param_schema` (x-normalize, x-suggest).
  - Workflow: `rotate_db_password` with ACTION nodes (policy checks, secret rotation) and USER_INTERACTION nodes (approval, forms).

Flow

1) Operator asks the agent
- Human: “Rotate the prod DB password for the payments API.”
- Agent runs a domain prompt to clarify scope and find target URIs (uses x-suggest tools):
  - Calls `secrets.catalog.search` with q=payments and prefix based on environment.
  - Shows options, requests confirmation.
- Human selects the right secret shorthand `kv://payments/prod/db_password`.

2) Agent normalizes the shorthand (prompt + tool)
- Agent calls `secrets.catalog.normalize` (x-normalize) to get canonical:
```json
{ "canonical": "openbao+kv2://secret/payments/prod#db_password" }
```
- Agent now has a safe, canonical `uri`.
  - If the normalize tool is unavailable or returns no value, the server applies a generic fallback during orchestrator preflight: echo values containing `://` unchanged; otherwise prepend `args.default_prefix` when provided.

3) Agent starts the workflow (MCP tool or REST)
- Chosen: MCP tool façade. Arguments include the canonical `uri` and minimal context.

MCP tool call
```json
{
  "tool": "workflow.start",
  "args": {
    "workflow_name": "rotate_db_password",
    "data": {
      "uri": "openbao+kv2://secret/payments/prod#db_password",
      "change_window": "2025-09-15T04:00:00Z",
      "notify_channel": "#prod-changes"
    }
  }
}
```

Equivalent REST
```http
POST /workflow/start
Content-Type: application/json

{
  "workflow_name": "rotate_db_password",
  "data": {
    "uri": "openbao+kv2://secret/payments/prod#db_password",
    "change_window": "2025-09-15T04:00:00Z",
    "notify_channel": "#prod-changes"
  }
}
```

4) Engine executes until approval gate, returns self‑describing WAITING
- USER_INTERACTION(approval) node requires human authorization.
- Response includes:
  - required_action.task_type=approval with allowed_decisions.
  - request_format for resume (method/url/headers/body shape).
  - workflow_status, state_version, idempotency_key, fingerprint.
  - ai_context.policy_flags.requires_human=true.

Excerpt
```json
{
  "status": "waiting",
  "correlation_id": "f4a6…",
  "result": {
    "workflow_status": "waiting",
    "state_version": 12,
    "contract_version": "1.0",
    "required_action": {
      "task_type": "approval",
      "task_name": "ProdChangeApproval",
      "allowed_decisions": ["approve","reject"],
      "description": "Rotate prod DB password for payments"
    },
    "request_format": {
      "method": "POST",
      "url": "/workflow/resume/8db1…",
      "headers": {"content-type":"application/json", "If-Match": "12"},
      "body": {
        "task_id": "8db1…",
        "decision": "approve|reject",
        "data": {"comment": "…"},
        "state_version": 12,
        "idempotency_key": "wf:8db1:node:12:actor-arn"
      },
      "fingerprint": "sha256:…"
    },
    "ai_context": {
      "approve": "Use if maintenance window active; impact < 1 min",
      "reject": "Use if change freeze",
      "policy_flags": {"requires_human": true}
    },
    "_links": {"resume": {"href": "/workflow/resume/8db1…","method":"POST"}}
  }
}
```

5) Agent requests approval (prompt) and posts resume
- Agent uses an MCP prompt to craft a short approval summary (redacted), sends to approver (email/Slack).
- Approver confirms. Agent resumes via MCP or REST.

REST resume (with concurrency + idempotency)
```http
POST /workflow/resume/8db1…
Content-Type: application/json
If-Match: 12

{
  "data": {"decision": "approve", "comment": "In window"},
  "metadata": {"source": "mcp_agent"},
  "state_version": 12,
  "idempotency_key": "wf:8db1:node:12:actor-arn"
}
```

What if stale?
- If `If-Match` is stale → 412 with a refreshed WAITING payload.
- If body `state_version` is stale → 409 with refreshed WAITING; agent refetches and retries with the new version.

6) Engine proceeds; Orchestrator fills/normalizes any remaining params
- ACTION node: “Rotate KVv2 secret”.
- Param Orchestrator runs preflight:
  - applies x-defaults (e.g., rotation TTL),
  - x-compose/x-decompose if needed,
  - x-normalize on `uri` (no-op since already canonical),
  - validate JSON-Schema.
- If a required parameter is missing (e.g., `notify_channel`):
  - Orchestrator auto-creates a FORM USER_INTERACTION; agent receives another WAITING with a form schema.
  - Agent fills and resumes using the same request_format semantics.

7) Rotation and propagation (inside ACTION nodes)
- Provider strategy writes new value to KVv2 (`create_or_update_secret`).
- Custom metadata stamped (`created_by`, `owner`) if missing.
- Downstream tasks: update Kubernetes Secret, bounce deployment, run health checks.
- If any call fails, engine retries per node policy; on persistent failure, returns WAITING with remediation form (e.g., fallback plan) or FAIL per workflow config.

8) Completion
- Engine returns COMPLETED with receipts, audit IDs, and mermaid diagrams.

Completion excerpt
```json
{
  "status": "success",
  "result": {
    "workflow_status": "completed",
    "data": {
      "secret_uri": "openbao+kv2://secret/payments/prod#db_password",
      "kv_version": 57,
      "k8s_secret": "payments-db-pass",
      "deployment_bounce": "success",
      "checks": {"db_connectivity":"ok","latency_ms":18}
    }
  }
}
```

How prompts, tools, and workflows interplay

- Prompts (think/collect):
  - Elicit missing data (“which secret?”), produce Plan‑IR drafts, summarize approvals.
  - Use system `param_schema` and x‑fields to ask the right questions and call suggesters.
- MCP Tools (do):
  - `secrets.catalog.*` for search/normalize/mounts suggestions.
  - `workflow.start` and `workflow.resume` to execute through the graph.
- Graph is the executor:
  - All side effects happen inside ACTION nodes; approvals/forms are standard USER_INTERACTION nodes.
  - Plan‑IR, when used, is compiled to ephemeral nodes (no direct execution by the agent).

Concrete alternates you’ll hit

- “Form-first” waits: If the workflow begins with a form, the first WAITING contains a form schema. The agent either asks the user or uses suggesters (MCP tools) to fill fields, then resumes. Orchestrator validates again before any side effects.
- Conflict retry: Two agents race to resume the same task. One wins; the other gets 409. It refetches `/workflow/status/{id}`, reads the new WAITING (or COMPLETED), and adjusts.
- Idempotent retry: Network issues. The agent resends the same `/resume` with the same `idempotency_key`. Engine detects duplicate and returns the original response; no double-rotate.

Minimal “how-to” cheat sheet

- Discovery/slot fill:
  - Use prompts to clarify intent.
  - Use MCP tools from system `param_schema` x‑suggest/x‑normalize to populate values.
- Execute:
  - Start the workflow via `workflow.start`.
  - Follow the self‑describing WAITING:
    - If `task_type=approval` → collect human approval; resume with decision.
    - If `task_type=form` → fill fields; resume with `data`.
  - Always include `state_version` (If‑Match) and `idempotency_key` when resuming.
- Never:
  - Call internal ACTION/NODE handlers directly.
  - Bypass the workflow engine for side effects.

This is the “super realistic” loop you’ll see daily: the agent uses prompts to think and MCP tools to do, while the graph engine executes deterministically with strong safety (approval gates, concurrency, idempotency, audit).