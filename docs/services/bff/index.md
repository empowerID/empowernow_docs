# Backend for Frontend (BFF)

The EmpowerNow BFF is the session and security gateway for our SPAs:

- Terminates OAuth in the backend (tokens never reach the browser)
- Issues/validates httpOnly session cookies and CSRF tokens
- Authorizes each request via the PDP (AuthZEN) before proxying
- Proxies canonical `/api/...` routes to backend services

Start here:

- Overview: what the BFF is and isn’t → `Explanations / BFF for SPAs — How It Works`
- Executive overview: business value and visuals → `Explanations / BFF — Executive Overview`
- Visual Guide: presentable diagrams of flows and routing → `Explanations / BFF Visual Guide`
- SPA Golden Path: wire a React app to the BFF → `Tutorials / SPA Golden Path`
- Traefik: how ForwardAuth integrates → `Reference / Traefik ForwardAuth`

Doc types in this section:

- Tutorials: end-to-end walkthroughs for first-time setup
- How‑to guides: focused tasks (deploy, configure, integrate)
- Explanations: architecture and reasoning
- Reference: definitive details (config, endpoints, evidence)

## Specialized endpoints

Quick links to commonly used specialized APIs exposed by the BFF:

- EmpowerID direct API: workflows and WebUI → [Reference / EmpowerID direct API](./reference/empowerid-direct)
- Legacy services proxy → [Reference / Legacy proxy](./reference/legacy-proxy)
- Streaming / SSE → [Reference / Streaming / SSE](./reference/streaming)
- IdP admin proxy → [Reference / IdP admin proxy](./reference/idp-admin-proxy)
- Health / Metrics → [Reference / Health / Metrics](./reference/health-metrics)
- YAML proxy (routes.yaml) → [Reference / YAML proxy](./reference/proxy-yaml-reference)
- PDP mapping (pdp.yaml) → [Reference / PDP mapping](./reference/pdp-mapping)
