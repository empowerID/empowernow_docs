---
title: Authorization (OpenID AuthZEN via BFF)
sidebar_label: Authorization (AuthZEN)
description: Implementation-accurate guidance for SPA/BFF/PDP authorization using OpenID AuthZEN in the Experience app.
---

## Authorization overview

- Framework: OpenID AuthZEN PDP behind a BFF.
- Transport: Same‑origin requests from SPA → BFF; BFF preserves AuthZEN paths to PDP.
- Endpoints (BFF → PDP):
  - POST `/access/v1/evaluation` – single decision
  - POST `/access/v1/evaluations` – batch decisions
- Decision model: PDP returns a boolean decision plus optional obligations and explanations. The SPA must “fail closed” if requests fail.

## What we protect (defense in depth)

- Routes/pages: e.g., `pages:list` gated by action `view_all`.
- Navigation/menu links: render only if PDP allows for the associated resource/action.
- Widgets and in‑page actions: e.g., Execute workflow uses `workflows:execute_shortcut` with action `execute_quick`.
- Row‑level and bulk actions: batch PDP checks for lists/tables; disable/hide controls when denied.
- Plugin routes/widgets: plugins declare `resource`/`action` hints; host pre‑gates via batch PDP on manifest load and per‑render.
- API/SSE calls that produce sensitive data: BFF enforces session and adds service tokens; PDP ensures the SPA only renders permitted UI.

## How PDP requests are built

- Subject (required):
  - Source: authenticated session via BFF; sent explicitly for clarity/compliance
  - Canonical (enforced): `subject.type = "account"`, `subject.id = "auth:account:{provider}:{user_id}"`
  - Provider note: `{provider}` is the IdP entry `provider` alias (falls back to entry `name`). This stabilizes ARNs across audiences that share an issuer (e.g., admin vs CRUD), yielding `auth:account:empowernow:{user_id}`.
  - Example: `subject: { type: "account", id: "auth:account:oidc:alice@example.com" }`
- Resource (required):
  - Shape: `resource: { type: "<domain>", id: "<identifier>" }`
  - Examples:
    - Pages list: `{ type: "pages", id: "list" }`
    - Workflow quick‑launch: `{ type: "workflows", id: "execute_shortcut" }`
    - Task operation: `{ type: "tasks", id: "<task_id>" }`
- Action (required):
  - Shape: `action: { name: "<verb_or_capability>" }`
  - Common names: `view_all`, `execute_quick`, `start`, `resume`, `complete`
- Context (optional but recommended):
  - Shape: `context: { ... }`
  - Typical attributes: request metadata (`ip`, `user_agent`, `request_time`); UI or row context (`reason`, `resourceAttributes`, `locations`)
- Headers (SPA → BFF):
  - `Content-Type: application/json`, `X-Requested-With: XMLHttpRequest`, `X-CSRF-Token` (when present), `credentials: include`

## Single decision examples

Request body:
```json
{
  "subject": { "type": "account", "id": "auth:account:oidc:alice@example.com" },
  "resource": { "type": "workflows", "id": "execute_shortcut" },
  "action": { "name": "execute_quick" },
  "context": { "ip": "203.0.113.10", "user_agent": "Mozilla/5.0" }
}
```

Response:
```json
{ "decision": true, "obligations": [], "explanation": { "mermaid": "graph TD; ..." } }
```

curl:
```bash
curl -sS -X POST https://experience.ocg.labs.empowernow.ai/access/v1/evaluation \
  -H "Content-Type: application/json" \
  --cookie "bff_session=..." \
  --data '{"subject":{"type":"account","id":"auth:account:oidc:alice@example.com"},"resource":{"type":"workflows","id":"execute_shortcut"},"action":{"name":"execute_quick"},"context":{"ip":"203.0.113.10","user_agent":"Mozilla/5.0"}}'
```

Browser fetch:
```ts
const csrf = document.cookie.match(/(?:^|; )_csrf_token=([^;]+)/)?.[1] || '';
const res = await fetch('/access/v1/evaluation', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, 'X-Requested-With': 'XMLHttpRequest' },
  body: JSON.stringify({
    subject: { type: 'account', id: 'auth:account:oidc:alice@example.com' },
    resource: { type: 'pages', id: 'list' },
    action: { name: 'view_all' },
    context: {}
  })
});
const { decision } = await res.json();
```

## Batch decision examples

Request body:
```json
{
  "evaluations": [
    { "subject": { "type": "account", "id": "auth:account:oidc:alice@example.com" }, "resource": { "type": "pages", "id": "list" }, "action": { "name": "view_all" } },
    { "subject": { "type": "account", "id": "auth:account:oidc:alice@example.com" }, "resource": { "type": "tasks", "id": "task-123" }, "action": { "name": "complete" }, "context": { "reason": "approve" } }
  ]
}
```

Response:
```json
{ "decisions": [ { "decision": true }, { "decision": false, "obligations": [{ "id": "require_mfa", "type": "mfa" }] } ] }
```

curl:
```bash
curl -sS -X POST https://experience.ocg.labs.empowernow.ai/access/v1/evaluations \
  -H "Content-Type: application/json" \
  --cookie "bff_session=..." \
  --data '{"evaluations":[{"subject":{"type":"account","id":"auth:account:oidc:alice@example.com"},"resource":{"type":"pages","id":"list"},"action":{"name":"view_all"}},{"subject":{"type":"account","id":"auth:account:oidc:alice@example.com"},"resource":{"type":"tasks","id":"task-123"},"action":{"name":"complete"},"context":{"reason":"approve"}}]}'
```

Browser fetch:
```ts
const csrf = document.cookie.match(/(?:^|; )_csrf_token=([^;]+)/)?.[1] || '';
const resp = await fetch('/access/v1/evaluations', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, 'X-Requested-With': 'XMLHttpRequest' },
  body: JSON.stringify({
    evaluations: [
      { subject: { type: 'account', id: 'auth:account:oidc:alice@example.com' }, resource: { type: 'pages', id: 'list' }, action: { name: 'view_all' } },
      { subject: { type: 'account', id: 'auth:account:oidc:alice@example.com' }, resource: { type: 'workflows', id: 'execute_shortcut' }, action: { name: 'execute_quick' } }
    ]
  })
});
const { decisions } = await resp.json();
```

## Mapping guidance

- Pages: `resource: { type: "pages", id: "list" }`, `action: { name: "view_all" }`
- Workflows:
  - Launch pad/quick run: `{ type: "workflows", id: "execute_shortcut" }`, `action: { name: "execute_quick" }`
  - Start/resume: `{ type: "workflow", id: "<workflow_id>" }`, action `start` or `resume`
- Tasks: row action complete: `{ type: "tasks", id: "<task_id>" }`, action `complete`
- Plugins: routes `{ type: "plugin.route", id: "<path>" }`; widgets `{ type: "plugin.widget", id: "<slot_or_name>" }` with action `view`

## Interpretation and UI behavior

- `decision: true` → render/enable the affordance
- `decision: false` → hide or disable with a clear affordance (tooltip/message)
- Obligations may require extra UX (e.g., MFA) before enabling

## Error handling

- SPA: network/JSON errors are treated as deny (fail closed) for protected UI
- BFF: preserves `/access/v1/*`, attaches service token, returns 401 for API calls if no session

## Performance and caching

- Single checks for high‑value UI; batch checks for lists/menus/plugins
- Short TTL caching in hooks to avoid redundant calls within a view

## Compliance and invariants

- Requests include required AuthZEN fields: `subject`, `action`, `resource`
- `resource` includes both `type` and `id`; `action` includes `name`
- SPA never sends tokens; BFF injects service tokens; cookies carry session

## Quick reference (copy‑paste)

Endpoints:

- POST `/access/v1/evaluation` – single decision
- POST `/access/v1/evaluations` – batch decisions

Single request example:

```json
{
  "subject": { "type": "account", "id": "auth:account:oidc:alice@example.com" },
  "resource": { "type": "workflows", "id": "execute_shortcut" },
  "action": { "name": "execute_quick" },
  "context": { "ip": "203.0.113.10" }
}
```

Batch request example:

```json
{
  "evaluations": [
    {
      "subject": { "type": "account", "id": "auth:account:oidc:alice@example.com" },
      "resource": { "type": "pages", "id": "list" },
      "action": { "name": "view_all" }
    },
    {
      "subject": { "type": "account", "id": "auth:account:oidc:alice@example.com" },
      "resource": { "type": "plugin.widget", "id": "hello:HelloWidget" },
      "action": { "name": "view" }
    }
  ]
}
```

What is protected:

- Routes (e.g., `/workflows`) via action `view_all` on `workflows`/`pages`
- Navigation links (hidden when denied)
- Widgets: core and plugin (e.g., `plugin.widget` with `view`)

SPA behavior:

- Subject is read from `/auth/session` and injected into all PDP requests
- On plugin manifest load, the app pre‑gates contributed routes/widgets with `/access/v1/evaluations` and mounts only allowed ones
- Hooks fail closed on errors


