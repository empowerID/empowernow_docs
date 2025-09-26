# FAQ — ARIA MCP Gateway (Tool‑Boundary Enforcement)

## What does plan discipline mean?
Each tool call must match the signed plan step `{tool, params_fingerprint}`; off‑plan calls are blocked.

## Why pin schemas?
Pins `{version,hash}` prevent silent schema drift and enable safe rollouts with CURRENT + grace windows.

## Does the gateway enforce budgets?
Budgets are enforced by ARIA Shield. The MCP Gateway enforces plan/params/egress and emits receipts.

## How are params/egress allowlists defined?
Per tool, with regex for parameters and host[:port] patterns for egress.

## What’s the latency impact?
Checks are lightweight and cache‑friendly; typical overhead remains small compared to tool latency.

## See also
- `/docs/services/bff/explanation/bff_gateway.md`
- `/docs/services/bff/explanation/bff_gateway_technical.md`
- `/docs/services/bff/reference/routes-reference.md`
