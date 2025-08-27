# Docs — Start Here

## Quickstart
Bring up ARIA locally with docker compose, seed a sample tool, and run a zero‑shot workflow.
- Step 1: Clone the repo and run `docker compose up`
- Step 2: Call the IdP token exchange to mint an ARIA Passport (RAR + schema pins)
- Step 3: Invoke the ARIA Gateway `/mcp/{tool}` and observe PDP constraints
- Step 4: Start a workflow and inspect `mermaid_full`, `next_paths`, and receipts

## Core APIs
- PDP Evaluation — `POST /access/v1/evaluation` and `/evaluations`
- ARIA Gateway (MCP) — `POST /mcp/{tool_id}`
- BFF — `/chat/completions` (provider‑compatible surface)
- Tool Registry — `GET /tools/{id}`, `HEAD /tools/{id}`, `GET /tools/{id}/pin`
- Receipt Vault — receipt sign/verify endpoints
- IdP Identity Chaining — assertion and brokered exchange endpoints

## Guides
- Agent Passports (RAR, DPoP, plan, schema pins)
- Self‑Driving Workflows (zero‑shot, next paths, Mermaid)
- AuthZEN mapping for PEP/PDP
- Receipts viewer and exports

CTAs: Try the quickstart · See evaluation examples · Start a workflow
