---
id: bff-visual-guide
title: BFF Visual Guide — Golden Path, Routing, PDP, EmpowerID, Legacy
sidebar_label: Visual Guide
sidebar_position: 2
tags: [service:bff, type:explanation, visuals]
---

Use this visual guide to explain the BFF to any audience in minutes. Each diagram is presentable as a slide; keep this page open during your talk.

## High‑level architecture

```mermaid
flowchart LR
  subgraph Client["Client"]
    SPA["Browser / SPA"]
  end
  subgraph Edge["Traefik"]
    TR["Routers + headers<br/>(ForwardAuth optional)"]
  end
  subgraph BFF["BFF"]
    AUTH["/auth/* (login, callback, verify/forward, csrf, logout)"]
    API["/api/** (proxy, composition)"]
  end
  subgraph Control["Control"]
    IDP["IdP OIDC"]
    PDP["PDP AuthZ"]
    REDIS[("Redis sessions and PDP cache")]
  end
  subgraph Backends["Backends"]
    SVC["Backend Services"]
  end
  SPA --> TR --> AUTH
  TR --> API
  BFF <--> IDP
  BFF <--> PDP
  BFF <--> REDIS
  API --> SVC
```

## Golden Path (SPA login + API calls)

```mermaid
sequenceDiagram
  autonumber
  participant SPA
  participant BFF
  participant IdP
  SPA->>BFF: GET /auth/login
  BFF-->>SPA: 302 to IdP /authorize (PKCE/PAR)
  SPA->>IdP: GET /authorize
  IdP-->>BFF: 302 /auth/callback?code=...
  BFF->>IdP: POST /token
  BFF-->>SPA: Set-Cookie bff_session
  BFF-->>SPA: 302 redirect to /
  SPA->>BFF: GET /api/** (cookie + CSRF for writes)
  BFF-->>SPA: 200 JSON
```

## How SPA-local "/api" calls reach the BFF

- SPA calls same-origin paths like `/api/<app>/...`.
- Traefik matches `PathPrefix(/api/*)` and routes to the BFF service.
- The BFF looks up the request in `routes.yaml` (`path` = client path, `upstream_path` = backend path) and proxies to the target service, injecting auth/context headers.

Example

```text
Client → GET /api/myapp/items/123
Traefik → forwards to BFF (rule: PathPrefix(/api/))
BFF → routes.yaml: path "/api/myapp/items/*" → target_service "my_service", upstream_path "/items/{path}"
BFF → calls GET http://my-service:8080/items/123 (+ Authorization, X-Correlation-ID)
BFF → returns JSON to SPA
```

Mini routing diagram

```mermaid
flowchart LR
  UI[SPA] -->|GET /api/myapp/items/123 (cookie)| TR[Traefik]
  TR --> BFF
  subgraph BFF
    R[(routes.yaml)]
  end
  BFF -->|GET /items/123 + Authorization + X-Correlation-ID| SVC[my_service]
  SVC --> BFF --> UI
```

See also: `Reference / YAML proxy (routes.yaml)` and `Reference / Traefik ForwardAuth`.

### Automation Studio (Visual Designer) path examples

- CRUD and SSE: SPA calls `/api/crud/...` → Traefik → BFF → `crud_service`
- PDP (AuthZEN): SPA calls `/access/v1/evaluation` and `/access/v1/evaluations` → Traefik → BFF → `pdp_service` (path preserved)
- Cookies/credentials: fetch `credentials: 'include'`, axios `withCredentials: true`; EventSource sends cookies (use `{ withCredentials: true }` for cross-origin dev)

See also: `Reference / SPA PDP usage` for a per‑SPA inventory of PDP calls and payloads.

## Routing layers (where ForwardAuth applies)

```mermaid
flowchart TB
  subgraph Traefik Routers
    RP["bff-public: Host(api..) && PathPrefix(/auth/*)"]
    RR["bff-protected: Host(api..) && PathPrefix(/api/*)<br/>ForwardAuth disabled (BFF handles auth)"]
    PP["pdp-protected: Host(pdp..)<br/>ForwardAuth → BFF /auth/forward"]
    TD["traefik-dashboard: Host(traefik..)<br/>ForwardAuth → BFF /auth/forward"]
  end
  subgraph BFF
    Verify["GET /auth/verify or /auth/forward"]
    Auth["/auth/login, /auth/callback, /auth/logout, /auth/csrf"]
    Api["/api/**"]
  end
  RP --> Auth
  RR --> Api
  PP --> Verify --> PP
  TD --> Verify
```

## PDP mapping and decision flow

```mermaid
sequenceDiagram
  autonumber
  participant Client
  participant BFF
  participant Mapper as PathMapper
  participant PDP as PDP Service
  Client->>BFF: GET /api/crud/forms/123
  BFF->>Mapper: Map via pdp.yaml:endpoint_map
  Mapper-->>BFF: (resource=form, id=123, action=read, props)
  alt cached decision
    BFF-->>Client: 200 (cached allow)
  else cache miss
    BFF->>PDP: POST /v1/evaluation {subject, resource, action, context}
    PDP-->>BFF: decision
    BFF-->>Client: 200 or 403
  end
```

## YAML proxy (routes.yaml) model

What it defines: `id`, `path`, `target_service`, `upstream_path`, `methods`, `auth` (`session|none`), `streaming`, `preserve_path`.

```mermaid
flowchart LR
  subgraph Caller
    C[SPA / Service]
  end
  subgraph BFF
    IN["Request: /api/<app>/**"]
    RY[(routes.yaml)]
    OUT[Proxy to upstream]
  end
  subgraph Services
    CRUD[CRUDService]
    OTHER[Other APIs]
  end
  C --> IN --> RY --> OUT --> CRUD
  OUT -.-> OTHER
```

## Legacy services proxy

```mermaid
sequenceDiagram
  participant SPA
  participant BFF
  participant Legacy as Legacy Service
  SPA->>BFF: /api/v1/proxy/{service}/{path}
  BFF->>BFF: Circuit breaker + cache lookup (GET)
  alt cache hit
    BFF-->>SPA: 200 (X-Cache: HIT)
  else cache miss
    BFF->>Legacy: request (auth headers + correlation id)
    Legacy-->>BFF: response
    BFF->>BFF: cache write (GET 200)
    BFF-->>SPA: response (X-Cache: MISS)
  end
```

## EmpowerID direct endpoints

```mermaid
sequenceDiagram
  participant SPA
  participant BFF
  participant EmpowerID as EmpowerID API
  SPA->>BFF: POST /api/v1/empowerid/workflow {workflow_name, parameters}
  BFF->>BFF: Load empowerid_endpoints.yaml (pdp_resource/action)
  BFF->>EmpowerID: POST /workflows/{name} (client-credentials bearer)
  EmpowerID-->>BFF: 200 JSON
  BFF-->>SPA: Result
```

Endpoints quick list:

- POST `/api/v1/empowerid/workflow`
- POST `/api/v1/empowerid/webui`
- GET `/api/v1/empowerid/workflows`
- GET `/api/v1/empowerid/webui/types`
- GET `/api/v1/empowerid/webui/types/{type}/methods`

## Config sources at a glance

```mermaid
flowchart TB
  subgraph Config
    RY[routes.yaml]
    PY[pdp.yaml]
    IY[idps.yaml]
    EY[empowerid_endpoints.yaml]
  end
  subgraph Runtime
    BFF[BFF]
  end
  RY --> BFF
  PY --> BFF
  IY --> BFF
  EY --> BFF
```

## Local/dev stack (compose)

```mermaid
flowchart LR
  subgraph Traefik
    R1["api.* /api/**"]
    R2["automate, authn, authz /auth/**"]
    FA[bff-forwardauth]
  end
  subgraph BFF
    V["/auth/verify/"]
    A["/auth/login, /auth/callback, /auth/logout/"]
    API["/api/**/"]
  end
  R1 --> FA --> V --> API
  R2 --> A
```

---

### Presenter notes (grab-and-go)

- Start with the architecture slide and emphasize: tokens stay server‑side; SPAs use cookies.
- Golden Path: PKCE/PAR redirect; cookie set; CSRF required for writes.
- Routing: ForwardAuth only on edge hosts like PDP and dashboard; disabled for same‑origin `/api/**`.
- PDP: show how a path maps to resource/action; caching reduces latency.
- routes.yaml: canonical `/api/<app>/**` families; use custom endpoints for composition/transformations.
- Legacy proxy: bridge with circuit breaker and cache; not for new greenfield.
- EmpowerID: catalog‑driven; workflows via client‑credentials; WebUI per catalog.


