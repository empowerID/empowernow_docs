---
title: BFF – FAQ
sidebar_position: 2
---

General

- What is the BFF? A backend that terminates OAuth, issues a session cookie, enforces authorization via a PDP, and proxies to internal services. See: BFF for SPAs overview.
- Where are APIs defined? `ServiceConfigs/BFF/config/routes.yaml` (canonical `/api/...` paths → upstream services, `auth: session`).
- Where are authorization rules mapped? `ServiceConfigs/BFF/config/pdp.yaml` under `endpoint_map` (path/method → resource/action/id_from/props).

What is a BFF (and how ours differs from API gateways)?

- Definition: A Backend‑for‑Frontend is an app‑specific backend that owns auth flows (PKCE/PAR, sessions/CSRF), composes data from multiple services, enforces authorization via PDP, and exposes a stable, UX‑oriented API to the frontend.
- Our BFF (this repo):
  - Auth: full OAuth login, session cookies, CSRF, optional DPoP/mTLS; ForwardAuth integration at edge; no tokens in the browser for same‑origin SPAs.
  - Authorization: calls a PDP (AuthZEN) using `pdp.yaml:endpoint_map`; caches decisions with separate allow/deny TTLs.
  - Composition: aggregates/orchestrates calls, handles streaming, uploads, background work, and error shaping.
  - Contracts: canonical `/api/<app>/**` via `routes.yaml`; custom endpoints where composition/security is required.
- vs API gateways (Kong/NGINX/Traefik):
  - Gateways excel at L7 routing, rate limiting, TLS, and header transforms. They don’t own app auth flows, sessions/CSRF, or PDP enforcement per endpoint.
  - In our stack, Traefik provides edge routing, TLS, security headers, and ForwardAuth. The BFF owns sessions, PDP checks, and business composition. Kong would overlap with Traefik in routing/middleware but still wouldn’t replace the BFF’s app logic.

Admins

- Where is configuration kept? `ServiceConfigs/BFF/config/*.yaml` including `routes.yaml`, `pdp.yaml`, `idps.yaml`, `logging.yaml`, and more.
- How do I add a new API surface? Add a service in `routes.yaml:services`, then a route entry under `routes` with your `/api/<app>/*` path, `target_service`, `upstream_path`, methods, and `auth: session`.

DevOps

- How is it run locally? `CRUDService/docker-compose-authzen4.yml` (stack with Traefik, BFF, Redis, PDP, IdP). Health checks: `http://localhost:8000/health` (BFF), `http://localhost:8080/ping` (Traefik).
- How does Traefik authenticate requests? ForwardAuth hits BFF `/auth/forward` (verified by tests in TEST_EXECUTION_GUIDE). BFF validates session, then routes per `routes.yaml`.
- Which PDP endpoints are exposed via BFF? See `routes.yaml` entries like `/access/v1/evaluation` (preserve path) to `pdp_service`.

Frontend (SPA)

- How do SPAs integrate? Set `VITE_BFF_BASE_URL`, wrap with `AuthProvider` from `@empowernow/bff-auth-react`, and call APIs via `apiClient`/`fetchWithAuth` (cookies are sent automatically). Code verified in `pdp_ui/frontend` and `idp_ui/frontend`.
- Do I send Authorization headers? No for same‑origin; the BFF uses httpOnly cookies. See: Integrate a React SPA with the BFF and SPA Golden Path.

Backend Developers

- How are permissions checked? `core/permissions.py` builds context (roles, headers, query, body subset, correlation ID), `services/path_mapper.py` maps request to resource/action from `pdp.yaml:endpoint_map`, then `services/pdp_client.py` calls PDP and caches decisions.
- Where are PDP endpoints configured? `pdp.yaml:endpoints` (e.g., `evaluation: "v1/evaluation"`). The client uses these for internal PDP calls.

- When do I need a custom BFF endpoint instead of just `routes.yaml`?
  - Use `routes.yaml` when:
    - You are proxying a single upstream with optional path templating (`upstream_path` with `{path}`), preserving the path, selecting methods, and applying built‑in auth modes (`auth: session | bearer | none`) and `streaming: true` for SSE.
  - Create a custom BFF endpoint when you need any of the following (not expressible in `routes.yaml`):
    - Aggregation/orchestration: one client call fan‑outs to multiple services, merges results, or sequences calls transactionally.
    - Security transformations: token exchange, signing (DPoP, mTLS client assertions), presigned URL minting, step‑up auth, or minting/downscoping `Authorization` headers beyond pass‑through.
    - Request/response shaping: canonical validation, schema mapping, pagination unification, partial field selection, error normalization, or PII redaction.
    - Stateful flows: CSRF‑bound actions with server state, idempotency keys, retries/circuit breakers, or saga choreography.
    - Long‑running or background work: enqueue a job and return 202 + status polling endpoint.
    - Specialized streaming: upload/download mediation (multipart, chunking, encryption/AV scanning) or WebSockets.
    - Per‑user/business rate limits or caching that can’t be handled by Traefik’s generic middleware.
  - Concrete examples in this repo:
    - Metrics sink handled directly by BFF: `POST /api/metrics` (see comment in `ServiceConfigs/BFF/config/routes.yaml`: “Metrics sink is handled directly by BFF code at /api/metrics (POST). No YAML proxy entry needed.”)
    - Auth router endpoints: `/auth/*` (login, callback, verify/forward, csrf, token) are implemented in the BFF, not proxied via `routes.yaml`.
    - Some SPA streaming endpoints are terminated by the BFF first (see Traefik labels in `CRUDService/docker-compose-authzen4.yml` for `bff-*-streaming`).
  - Quick checklist:
    - Does the route require calling more than one upstream? → Custom endpoint.
    - Do you need to alter auth materials (mint/transform tokens or headers)? → Custom endpoint.
    - Do you need to validate or reshape request/response bodies beyond simple path rewrites? → Custom endpoint.
    - Is it WebSocket, presigned upload/download, or background job control? → Custom endpoint.
    - Otherwise, if it’s a straight proxy with optional SSE, prefer `routes.yaml`.

Security & Auditors

- What authorizes access? AuthZEN PDP evaluation using mapped resource/action and context. Deny or allow decisions may be cached with different TTLs (`pdp.yaml:cache.ttl_allow/ttl_deny`).
- Where is direct PDP exposure controlled? Externally via BFF `routes.yaml` entries under PDP Service Routes (e.g., `/access/v1/evaluation`), internally via `pdp_client` (`v1/evaluation`).

QA & Testing

- How do we prove it works? Follow the QA Test Execution how‑to. Critical tests verify: Traefik ForwardAuth → BFF chain, middleware/routing, and real user workflows across IdP UI, Visual Designer, and PDP UI as documented in TEST_EXECUTION_GUIDE.

Troubleshooting quick answers

- 401 vs 403? 401 = unauthenticated (login). 403 = authenticated but PDP denied.
- “/api/api/...” double prefix? Use the app wrappers which strip leading `/api` before calling `apiClient`.
- DNS errors with `*.ocg.labs.empowernow.ai`? Add hosts file entries pointing to 127.0.0.1 for local.

Pointers

- Overview: BFF for React SPAs — How It Works
- Tutorial: React SPA + BFF — Golden Path
- How‑to: Integrate a React SPA with the BFF
- How‑to: Configure PDP (pdp.yaml)
- Reference: QA — Troubleshooting Checklist


