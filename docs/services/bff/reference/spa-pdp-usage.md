---
title: SPA PDP Authorization Inventory
sidebar_label: SPA PDP usage
---

This page inventories how each SPA uses the PDP (AuthZEN) via the BFF. It clarifies that `auth: "session"` on BFF routes enforces authentication only; PDP is invoked explicitly by SPAs through preserved AuthZEN endpoints or by backends internally.

## Key points

- BFF session: `auth: "session"` validates the user and CSRF but does not auto‑call the PDP.
- PDP calls from SPAs: use preserved paths `/access/v1/evaluation` and `/access/v1/evaluations` (proxied by the BFF to `pdp_service`).
- Subject: inferred by the BFF from the session cookie; SPAs do not send tokens.
- Cookies: include credentials in the browser (fetch `credentials: 'include'`, axios `{ withCredentials: true }`).

## Automation Studio (Visual Designer)

- Uses PDP for UI access control across many features.
- Where it calls PDP
  - Programmatic checks (single and batch): posts to `/access/v1/evaluation` and `/access/v1/evaluations` from frontend authz utilities.
  - Hook‑based checks used in navigation/components to gate pages and controls.
- Examples of gated areas (representative)
  - Workflows, Forms, Pages, Integrations, Connections, Tasks, Agents, Executions, Visualizer, Journeys, Admin Config.
- Payload shapes
  - Single evaluation:
    ```json
    {
      "resource": { "type": "<resourceType>", "id": "<optionalId>", "properties": { /* optional attrs */ } },
      "action": { "name": "<action>" },
      "context": { /* optional */ }
    }
    ```
  - Batch evaluation:
    ```json
    {
      "evaluations": {
        "<key>": {
          "resource": { "type": "<resourceType>", "id": "<optionalId>", "properties": { } },
          "action": { "name": "<action>" },
          "context": { }
        }
      }
    }
    ```

## IdP UI

- No direct PDP calls from the frontend.
- Relies on BFF session authentication and backend‑side authorization in the IdP service.

## PDP UI

- Uses PDP for evaluations, batches, and visualization/testing flows.
- Where it calls PDP
  - Typed client helpers post to `/access/v1/evaluation` and `/access/v1/evaluations`.
  - Visualization flows add `x-include-visualization: true` to requests for diagrams/artifacts.
- Payload shapes
  - Follows the same AuthZEN schema as above (single and batch), with optional visualization header.

## Routing and config

- AuthZEN paths are preserved and proxied by the BFF (session required):

```yaml
- id: "authzen-evaluation"
  path: "/access/v1/evaluation"
  target_service: "pdp_service"
  upstream_path: "/access/v1/evaluation"
  methods: ["POST", "OPTIONS"]
  auth: "session"
  preserve_path: true

- id: "authzen-evaluations"
  path: "/access/v1/evaluations"
  target_service: "pdp_service"
  upstream_path: "/access/v1/evaluations"
  methods: ["POST", "OPTIONS"]
  auth: "session"
  preserve_path: true
```

## See also

- Reference → `routes.yaml Reference`
- Reference → `YAML proxy (routes.yaml)`
- How‑to → `Integrate a React SPA with the BFF`
- Tutorial → `React SPA + BFF — Golden Path`


