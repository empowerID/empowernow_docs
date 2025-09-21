### Prompt → Plan → Workflow (End-to-End)

This walkthrough shows how a human-triggered MCP prompt produces a strict Plan IR, gets approved, and executes a governed workflow via CRUDService.

1) Discover and render a prompt
- Client calls `prompts/list` (optionally scoped to a virtual view like `/mcp/entra`).
- Client calls `prompts/get { name, arguments }` to render messages. Gateway prepends the contract header (single JSON, allowed kinds, require `id`).
 - Transport: via BFF `POST /api/crud/mcp/{view}/jsonrpc` for JSON‑RPC or `GET /api/crud/mcp/{view}/jsonrpc` (SSE bridge) for streamable clients.

2) Sampling (planning)
- The Agent runs once with the rendered messages. The instruction requires a single JSON object of `plan/v1` (no prose/backticks).
- The UI validates the result against the Plan IR schema.

3) Approval and simulation
- For high‑risk operations, the plan includes `approve` first and/or a dry‑run/simulate step. The UI shows the plan JSON for explicit consent.

4) Execution
- After approval, the UI executes the plan via CRUDService:
  - `workflow` steps → `POST /crud/workflow/start { workflow_name, data }`
  - `tool` steps → `POST /api/crud/execute { system, object_type, action, params }`
- The engine enforces allow_tags and idempotency, records a receipt, and streams status.
 - Security: Bearer token scopes `mcp.tools.discovery`/`mcp.tools.invoke` apply at BFF/CRUD; PDP may be consulted before execution.

Example (compact) plan
{
  "version":"plan/v1",
  "steps":[
    {"kind":"approve","id":"gate","params":{"message":"Create AD account for Jane Doe?"}},
    {"kind":"workflow","id":"create","ref":"av_ad_addomain_create_user","version":"1.0.0",
     "params":{ "FirstName":"Jane","LastName":"Doe","UserPrincipalName":"jane.doe@example.com","Password":"Temp$2025!" },
     "allow_tags":["account","create","ad"],"dry_run":true }
  ],
  "meta": { "prompt_id":"idp.identity.onboard@1.0.0","tenant":"cont-av" }
}

UI mapping
- Prompt Picker: lists prompts from `/api/crud/mcp/prompts` and renders via `/api/crud/mcp/prompts/get`.
- Plan Approval: validates JSON using Ajv, displays the steps, and executes via CRUDService endpoints.
- Streaming/Status: shows task/log updates and final results. Streamable clients can use the SSE JSON‑RPC bridge at `GET /api/crud/mcp/{view}/jsonrpc`.


