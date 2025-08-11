---
title: BFF – Amazing FAQ (Cross‑Persona)
sidebar_position: 2
---

General

- What is the BFF? A backend that terminates OAuth, issues a session cookie, enforces authorization via a PDP, and proxies to internal services. See: BFF for SPAs overview.
- Where are APIs defined? `ServiceConfigs/BFF/config/routes.yaml` (canonical `/api/...` paths → upstream services, `auth: session`).
- Where are authorization rules mapped? `ServiceConfigs/BFF/config/pdp.yaml` under `endpoint_map` (path/method → resource/action/id_from/props).

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


