## EmpowerNow React App Specification

This document specifies how EmpowerNow front-end React applications are built, configured, authenticated, deployed, and tested. It is intended for third‑party developers and internal “vibe coders” building new SPAs that conform to our platform standards.

### Scope
- IdP (Authentication Studio), PDP (Authorization Studio), and Workflow/Visual Designer SPAs follow the same conventions.
- SPAs are static builds served by Nginx and routed via Traefik; all API calls go through the Backend‑for‑Frontend (BFF) service.

## Architecture Overview
- **SPA framework**: React 18 + TypeScript 5, bundled with Vite.
- **Design system**: `@empowernow/ui` (Neon Flux theme) for consistent components and tokens.
- **Auth**: `@empowernow/bff-auth-react` integrates browser auth with the BFF, which implements secure OAuth/OIDC flows.
- **Data fetching**: TanStack Query v5 for server state; optional Redux Toolkit for UI/app state.
- **Transport**: All API requests are same‑origin to the BFF under `/api/**`. Prefer SSE for realtime updates where applicable.
- **Containerization**: Built artifacts are served by Nginx as static SPAs; Traefik routes static vs API paths; the BFF handles auth/session and proxies service APIs.

## Core Dependencies
- **Required**
  - `react`, `react-dom`
  - `react-router-dom` (v7) for routing
  - `@empowernow/ui` for UI components and Neon Flux design tokens
  - `@empowernow/bff-auth-react` for auth session + login flows
  - `@tanstack/react-query` for server state
  - `axios` for HTTP client (wrapped; see API section)
- **Common**
  - `@empowernow/common`, `@empowernow/react`
  - `antd` (select components), `monaco-editor` (where needed), `lucide-react`
  - `zod`/`ajv` for schema validation as needed

## Project Structure (baseline)
```
frontend/
  src/
    app/               # App bootstrap (providers, routing)
    pages/             # Route components
    features/          # Feature slices
    components/        # Reusable UI components
    services/          # API clients, adapters
    store/             # Optional Redux Toolkit store (UI state)
    lib/               # Utilities, hooks
  public/              # Static assets
  env.local.template   # Vite environment variables template
  package.json         # Scripts and deps
  nginx-spa.conf       # Nginx SPA fallback config
```

## Configuration (Vite envs)
Define these in `env.local` (do not commit secrets):
- `VITE_OIDC_AUTHORITY`: OIDC discovery base (e.g., `https://idp.ocg.labs.empowernow.ai/api/oidc`)
- `VITE_OIDC_CLIENT_ID`: OIDC client id (e.g., `spa-client`)
- `VITE_OIDC_SCOPE`: space‑separated scopes (e.g., `openid profile email admin.api`)
- `VITE_OIDC_RESOURCE` (optional): audience/resource when required by IdP
- `VITE_BFF_BASE_URL`: base URL for BFF; leave empty in same‑origin deployments (recommended)

Guidelines:
- Prefer same‑origin deployment where the SPA is hosted under the same domain as the BFF; set `VITE_BFF_BASE_URL` to empty and use relative `/api/**`.
- Do not embed direct service URLs in the SPA; route everything through the BFF for auth and policy enforcement.

## Routing
- Use `react-router-dom` v7 with standard SPA client‑side routing.
- Nginx serves `index.html` as a fallback (`try_files ... /index.html`) to support deep links.
- Keep route modules lazy‑loaded where sensible to optimize initial load.

## Authentication and Session
- Use `@empowernow/bff-auth-react` provider at the app root.
- Sessions are managed by the BFF (http‑only cookies). The SPA should:
  - Check session via `/api/auth/session` on load and on focus/visibility changes.
  - Initiate login via the auth provider; the BFF handles OIDC (FAPI/DPoP/private_key_jwt) and returns a session.
  - Never store access tokens in local storage; use cookies via same‑origin requests.

Minimal wiring example:
```tsx
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BffAuthProvider } from '@empowernow/bff-auth-react';
import App from './app/App';

const qc = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <BffAuthProvider>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </BffAuthProvider>
);
```

## API Access Pattern
- All requests are relative to the BFF under `/api/**`.
- Use a shared Axios instance configured for same‑origin credentials and error handling.
- Use TanStack Query for fetching/caching/invalidation; colocate queries with features.
- Prefer Server‑Sent Events (SSE) for realtime updates where supported (e.g., `/events/**`).

Axios instance:
```ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_BFF_BASE_URL || '/api',
  withCredentials: true,
  headers: { 'X-Requested-With': 'spa' }
});
```

React Query usage:
```ts
const { data, isLoading, error } = useQuery({
  queryKey: ['users', page],
  queryFn: () => api.get('/users', { params: { page } }).then(r => r.data)
});
```

SSE helper (example):
```ts
export function subscribe(path: string, onMessage: (data: any) => void) {
  const url = (import.meta.env.VITE_BFF_BASE_URL || '') + path;
  const es = new EventSource(url, { withCredentials: true } as any);
  es.onmessage = (e) => onMessage(JSON.parse(e.data));
  return () => es.close();
}
```

## Design System & Theming
- Use `@empowernow/ui` components and tokens to align with the Neon Flux design system.
- Import global CSS once at app root:
```ts
import '@empowernow/ui/dist/index.css';
```
- Avoid bespoke styling; extend via component tokens/props.

See also:
- [Design System (tokens, patterns, Monaco)](../../client_sdk/empowernow-packages/packages/empowernow-ui/docs/DESIGN_SYSTEM.md)
- [Design System Compliance Checklist](../../client_sdk/empowernow-packages/packages/empowernow-ui/docs/DESIGN_SYSTEM_CHECKLIST.md)
- [Vibe Coding Strategy](../../client_sdk/empowernow-packages/packages/empowernow-ui/docs/vibe-coding-strategy.md)
- [UI Quick Start](../../client_sdk/empowernow-packages/packages/empowernow-ui/docs/QUICK_START.md)

### Critical UI Pattern: Tile Grid (Do/Don't)
Use the standardized tile grid and glass card patterns. Do NOT use Ant Design List for card grids.

```tsx
// ❌ WRONG - Ant Design List grid breaks glass-card styling
import { List } from 'antd';

<List
  grid={{ gutter: 16, column: 3 }}
  dataSource={items}
  renderItem={(item) => (
    <List.Item>
      <Card>{item.content}</Card>
    </List.Item>
  )}
/>;
```

```tsx
// ✅ CORRECT - Use tile-grid + TileCard (from @empowernow/ui)
import { TileCard } from '@empowernow/ui';

<div className="tile-grid">
  {items.map(item => (
    <TileCard key={item.id} className="glass-card">
      {item.content}
    </TileCard>
  ))}
></div>;
```

## Local Development
- Scripts (typical):
  - `npm run dev` – start Vite dev server
  - `npm run build` – type‑check + build
  - `npm run test` – unit tests (Vitest + jsdom)
  - `npm run test:e2e` – Playwright E2E
- Create `env.local` from `env.local.template` and set VITE_* values.
- When running the full stack locally, use the shared docker‑compose files provided in `CRUDService/` if needed.

## Testing Standards
- **Unit**: Vitest + Testing Library for component and hook tests.
- **E2E**: Playwright tests run against the built SPA + BFF; headless in CI, headed locally as needed.
- Keep happy‑path auth/login flows covered. Validate `/api/auth/session` handling and protected route access.

## Build and Deployment
1) **Build** with Vite to `dist/`.
2) **Containerize** with Nginx serving the built assets and SPA fallback. Use the canonical Nginx config:
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
  location ~* \.(?:css|js|png|jpg|jpeg|gif|svg|woff2?)$ {
    try_files $uri =404;
    expires 30d;
    access_log off;
  }
}
```
3) **Route** via Traefik:
- Static content on host routers; exclude `/api/`, `/auth/`, and known streaming endpoints from SPA router rules.
- Example (compose label rule): `Host("authz.ocg.labs.empowernow.ai") && !PathPrefix("/api/") && !PathPrefix("/auth/")`
4) **BFF Integration**:
- BFF handles `/api/**` routes, auth flows, and session verification. Keep same‑origin when possible so cookies flow correctly.

Multi‑stage builds
- Our canonical build uses a multi‑stage Dockerfile that builds each SPA with Node, then copies `dist/` into lightweight `nginx:alpine` images per app.
- Compose targets produce `idp-ui`, `authz-ui`, and `workflow-ui` static containers, each with SPA fallback enabled.

## Security Guidelines
- Do not bypass the BFF; avoid direct service URLs.
- Do not store tokens in local/session storage; rely on http‑only cookies.
- Use same‑origin requests where possible; set `withCredentials: true`.
- Respect CSP; keep inline scripts/styles minimal and hashed when required.

## Accessibility & Performance
- Follow WCAG best practices; use semantic HTML and ARIA where appropriate.
- Code‑split large routes/features; cache immutable assets aggressively (hashed filenames).
- Keep bundle size in check; prefer composable UI over one‑off heavy widgets.

## Creating a New App
- Use the `@empowernow/ui` starter or CLI to scaffold consistent structure and theming.
- Wire `@empowernow/bff-auth-react`, React Query provider, and Router in `main.tsx`.
- Add an Axios instance under `services/api.ts` and feature‑scoped query hooks.
- Configure VITE_* envs; validate `/api/auth/session` flow early.

Helpful references:
- [UI Quick Start](../../client_sdk/empowernow-packages/packages/empowernow-ui/docs/QUICK_START.md)
- [Vibe Coding Strategy](../../client_sdk/empowernow-packages/packages/empowernow-ui/docs/vibe-coding-strategy.md)

### EmpowerNow Experience App (End‑User Interface)
The Experience app is the end‑user portal for the EmpowerNow Identity Fabric Suite. It must support customers running any subset of services (IdP, PDP, Workflow, CRUD, etc.). The UI enables or disables modules dynamically and calls all backends strictly through the BFF.

#### Modular Feature Activation
- Source of truth: a BFF‑served UI config document.
  - Recommended endpoint: `/api/configs/ui` (JSON) with an SSE stream at `/api/configs/stream` for live updates.
  - Example payload:
    ```json
    {
      "modules": {
        "idp": true,
        "pdp": true,
        "workflow": false,
        "crud": true
      }
    }
    ```
- Build‑time fallback (optional): `VITE_EXPERIENCE_MODULES=idp,pdp,workflow,crud` used only if the runtime config is unavailable.
- UI behavior:
  - Hide navigation and routes for disabled modules.
  - Guard deep links (redirect to home if module disabled).
  - Prefer runtime config over build‑time flags when both exist.

Minimal config hook:
```ts
import { useQuery } from '@tanstack/react-query';

export function useUiConfig() {
  return useQuery({
    queryKey: ['ui-config'],
    queryFn: () => fetch('/api/configs/ui', { credentials: 'include' }).then(r => r.json()),
    staleTime: 60_000
  });
}
```

Optional SSE subscription for live updates:
```ts
import { useEffect } from 'react';
import { subscribe } from '../services/sse'; // wrapper from this guide

export function useUiConfigStream(onUpdate: (cfg: any) => void) {
  useEffect(() => subscribe('/configs/stream', onUpdate), [onUpdate]);
}
```

#### Unified Multi‑Service API Layer
Implement a single `@api` module modeled after Visual Designer’s SDK‑backed client. Each service uses a canonical prefix routed by the BFF: `/idp/**`, `/pdp/**`, `/crud/**`, `/workflow/**`, etc.

```ts
// src/services/api.ts
import { apiClient } from '@empowernow/bff-auth-react';

function stripApi(path: string) { return path.replace(/^\/api/i, ''); }

export const api = {
  get: (path: string, opts?: any) => apiClient.get(stripApi(path), opts),
  post: (path: string, body?: any, opts?: any) => apiClient.post(stripApi(path), body, opts),
  put: (path: string, body?: any, opts?: any) => apiClient.put(stripApi(path), body, opts),
  patch: (path: string, body?: any, opts?: any) => apiClient.patch(stripApi(path), body, opts),
  delete: (path: string, opts?: any) => apiClient.delete(stripApi(path), opts)
};

// Namespaced helpers
export const idpApi = {
  getProfile: () => api.get('/idp/profile'),
  // ...other IdP endpoints
};

export const pdpApi = {
  listPolicies: () => api.get('/pdp/policies'),
  // ...other PDP endpoints
};

export const workflowApi = {
  listWorkflows: () => api.get('/workflow/workflows'),
};

export const crudApi = {
  listEntities: (t: string) => api.get(`/crud/${t}`),
};
```

Guidelines:
- Always use BFF‑relative paths; never call services directly.
- Keep each service in its own file and re‑export via an `@api/index.ts` barrel.
- Provide typed helpers per feature area; colocate React Query hooks with features.

#### Dynamic Navigation & Routing
- Build the menu and routes from the active modules list.
- Lazy‑load module routes to minimize initial bundle size.

```tsx
// Pseudocode
const routes = [
  modules.idp && { path: '/idp', element: <IdpRoutes /> },
  modules.pdp && { path: '/pdp', element: <PdpRoutes /> },
  modules.workflow && { path: '/workflow', element: <WorkflowRoutes /> },
  modules.crud && { path: '/data', element: <CrudRoutes /> }
].filter(Boolean);
```

#### Events & Realtime
- Prefer SSE for user notifications and job/task progress per module:
  - `/events/idp`, `/events/pdp`, `/events/workflow`, etc.
- Use a single SSE helper to subscribe/unsubscribe; namespace by module.

#### Docker & Traefik (Experience SPA)
- Build args (compose): `VITE_BFF_BASE_URL`, `VITE_OIDC_*`, `VITE_EXPERIENCE_MODULES` (optional).
- Traefik router for the Experience host should exclude all API/auth/stream routes from the SPA router rule, similar to Workflow UI:
  - Example rule: `Host("experience.ocg.labs.empowernow.ai") && !PathPrefix("/api/") && !PathPrefix("/auth/") && !PathPrefix("/events/") && !PathPrefix("/configs/stream") && !PathPrefix("/stream/") && !PathPrefix("/access/v1/") && !PathPrefix("/health")`

### Dashboard & Widgets
- Landing page is a PDP‑aware dashboard composed of widgets.
- Each widget declares `{ resource, action }` and is rendered only if `useAuthorization(resource, action)` allows.
- Users will be able to add/remove/reorder widgets (future); default set includes:
  - Tasks Summary (reads `/api/crud/tasks/summary`)
  - Workflow Shortcuts (invokes predefined workflows)
  - Recently Completed (reads `/api/crud/tasks?status=COMPLETED&limit=...`)
- Navigation menu must be PDP‑driven: only pages for which the user is authorized should be listed.

Reference components to embed from Visual Designer:
- `Visualizer/ExecutionView.tsx`: render workflow execution diagrams (mermaid) and raw JSON results.
- `VisualDesigner/WorkflowExecutor.tsx`: modal to execute workflows, monitor progress via SSE `/api/crud/events/workflow/status/{id}`, resume with forms.

Embedding guidance:
- Wrap embedded components with Experience providers (Auth, React Query).
- Calls must remain BFF‑relative; do not port any direct service URLs.
- Use the Experience `AuthZProvider` and `useAuthorization` to guard access to runner actions.

### End‑User Tasks & Approvals (Experience)
The Experience app provides a unified end‑user surface for Tasks/To‑Dos and approval requests sourced from the CRUD service via the BFF.

- Canonical endpoints (via BFF):
  - `GET /api/crud/tasks` – list, with filters: `status`, `type`, `search`, `limit`, `offset`
  - `GET /api/crud/tasks/summary` – counters for dashboard
  - `GET /api/crud/tasks/{id}` – task details
  - `POST /api/crud/tasks/{id}/complete` – complete/approve/reject

- Reference API (Visual Designer):

```29:36:visual_designer/visual_designer/frontend/src/core/api/tasks.ts
export async function listTasks(
  params?: TaskQueryParams,
  settings?: AppSettings
): Promise<TaskListResponse> {
  const qs = buildQuery(params as Record<string, unknown>);
  const path = qs ? `/api/crud/tasks?${qs}` : '/api/crud/tasks';
  return fetchWithAuth(path, { method: 'GET' }, settings) as Promise<TaskListResponse>;
}
```

```68:71:visual_designer/visual_designer/frontend/src/core/api/tasks.ts
export async function getTaskSummary(settings?: AppSettings): Promise<TaskSummaryCounters> {
  logger.debug('Fetching task summary counters');
  return fetchWithAuth('/api/crud/tasks/summary', { method: 'GET' }, settings) as Promise<TaskSummaryCounters>;
}
```

- Reference Page (Visual Designer):

```130:186:visual_designer/visual_designer/frontend/src/pages/TasksPage.tsx
return (
  <div style={{ background: '#0b1c3d', padding: 16 }}>
    <Space style={{ marginBottom: 16 }} wrap>
      <Tooltip title="Refresh">
        <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading} />
      </Tooltip>
      ...
    </Space>
    {loading ? (
      <Spin />
    ) : (
      <Table
        rowKey="id"
        dataSource={tasks}
        columns={columns}
        size="small"
        pagination={{ pageSize: PAGE_SIZE, current: page, total, onChange: (p) => setPage(p) }}
      />
    )}
    ...
  </div>
);
```

- Experience should mirror this API shape and UI patterns using `@empowernow/ui` components; page lives under `/tasks` and requires session + authorization (see PDP protection below).

### Page Protection via OpenID AuthZEN PDP
All pages must enforce authorization using the OpenID AuthZEN PDP through the BFF. The SPA must not call PDP directly; use BFF endpoints:

- `POST /access/v1/evaluation` – single decision
- `POST /access/v1/evaluations` – batch decisions

Reference (Visual Designer):

```1:12:visual_designer/visual_designer/frontend/src/core/auth/authz-context.tsx
import React, { createContext, useContext } from 'react';
const AuthZContext = createContext<PDPStrategy | null>(null);
...
```

```58:66:visual_designer/visual_designer/frontend/src/core/auth/authz-hooks.ts
const response = await fetch(`/access/v1/evaluation`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify({ resource: { type: res }, action: { name: act }, context: {} }),
  credentials: 'include',
});
```

```44:55:visual_designer/visual_designer/frontend/src/core/auth/authz-strategy.ts
const { data } = await axios.post('/access/v1/evaluation', {
  resource: { type: request.resourceType, id: request.resourceId, properties: request.context?.resourceAttributes || {} },
  action: { name: request.action },
  context: request.context,
}, { withCredentials: true });
```

Implementation guidance:
- Provide an `AuthZProvider` and a `useAuthorization()` hook to gate routes and actions.
- For pages, evaluate coarse permissions on route load; for action buttons (e.g., Approve), evaluate fine‑grained permissions per item.
- Fail closed on PDP errors; surface a helpful message and disable restricted actions.

## Handover Notes: Experience App Integration

These are the concrete infra/config steps required to run the Experience SPA in the platform. Use this as the completion checklist for the downstream team.

- Experience SPA container
  - Build from `experience/frontend/Dockerfile`.
  - Serve with `nginx-spa.conf` router fallback.
  - Compose service should include Traefik labels with SPA rule and security headers middleware reference:
    ```yaml
    # labels (example)
    traefik.enable: "true"
    traefik.http.routers.experience-ui.rule: >-
      Host(`experience.ocg.labs.empowernow.ai`) &&
      !PathPrefix(`/api/`) && !PathPrefix(`/auth/`) && !PathPrefix(`/events/`) &&
      !PathPrefix(`/configs/stream`) && !PathPrefix(`/stream/`) && !PathPrefix(`/access/v1/`) && !PathPrefix(`/health`)
    traefik.http.routers.experience-ui.entrypoints: websecure
    traefik.http.routers.experience-ui.tls: "true"
    traefik.http.routers.experience-ui.middlewares: security-headers@file
    traefik.http.services.experience-ui.loadbalancer.server.port: "80"
    ```

- BFF Traefik routers (on the BFF service) for the Experience host
  - Intercept Experience host API and streaming paths so they reach the BFF before the SPA router:
    - Streaming: rule on `Host(experience…) && PathPrefix(/events/|/configs/stream|/stream/|/test/events)` → service `api`
    - API/auth: rule on `Host(experience…) && (PathPrefix(/api/|/access/v1/|/auth/))` → service `api`
  - Use `security-headers@file` middleware, set priority ≥95 as in other SPAs.

- BFF configuration updates (ServiceConfigs)
  - `routes.yaml`: add internal endpoints for Experience runtime UI config
    - `GET /api/configs/ui` (session‑protected)
    - `GET /api/configs/stream` (SSE, session‑protected)
  - `settings.yaml`: add Experience domain to `cors.allow_origins` and localhost `5177` to `dev_origins`.

- IdP configuration updates (ServiceConfigs)
  - `settings.yaml`: add `experience.ocg.labs.empowernow.ai` to `trusted_hosts` and `cors_origins`; add `localhost:5177` for local dev.
  - `clients.yaml` (SPA client): append Experience URIs:
    - `redirect_uris`: `https://experience.ocg.labs.empowernow.ai/callback`, `http://localhost:5177/callback`
    - `post_logout_redirect_uris`: `https://experience.ocg.labs.empowernow.ai`, `http://localhost:5177`

- BFF environment (compose) updates
  - Add Experience domain to:
    - `ALLOWED_REDIRECT_ORIGINS`
    - `ALLOWED_FRONTEND_ORIGINS` (also include `http://localhost:5177`)

- Experience app routes & modules
  - Route: `/tasks` (Tasks & Approvals page). Requires session and authorization.
  - Feature toggling: driven by `/api/configs/ui` with SSE at `/api/configs/stream`; fallback to `VITE_EXPERIENCE_MODULES`.

- Local development
  - Bind hosts entry for `experience.ocg.labs.empowernow.ai` to the gateway IP used by Traefik.
  - Use `npm run dev` on port `5177` if testing without containers; set `VITE_BFF_BASE_URL` appropriately.


## Readiness Checklist
- Uses `@empowernow/ui` components and Neon Flux theme CSS.
- Auth wired via `@empowernow/bff-auth-react`; session check on load and protected routes.
- All API calls are to the BFF (`/api/**`), with credentials enabled.
- React Query used for server state; optional Redux Toolkit only for UI/app state.
- Env config documented and applied via Vite.
- Nginx SPA fallback in container; Traefik routes exclude `/api/` and `/auth/`.
- Unit tests (Vitest) and E2E tests (Playwright) pass locally.
- No direct service URLs or secrets in the client bundle.
- CSS import uses `@empowernow/ui/dist/index.css` at the app root.
- Tile grid uses `.tile-grid` + `TileCard`; Ant Design List grid is not used for cards.
- Passed visual QA against the Design System Compliance Checklist.

Quick code checks (optional):
```bash
# Non-standard opacity levels for deep space blue
grep -r "rgba(11, 28, 61, 0\.[^8]" src/

# Custom toolbar/header backgrounds (should use .glass-header)
grep -r "background.*rgba.*28.*61" src/ | grep -v "glass-header"

# Raw Monaco usage (should use EmpowerNowMonacoEditor)
grep -r "from.*monaco-editor" src/ | grep -v "type"

# 🚨 Ant Design List card grid anti-pattern
grep -r "List.*grid" src/ | grep -v "// Correct pattern"
```


### Core principles
- **End-user first**: fast, simple, predictable. Designer UI never bleeds into runtime.
- **BFF-only transport**: no tokens in the browser, cookie session via `/auth/session`.
- **PDP everywhere**: routes, nav, widgets, actions, and row-level affordances all PDP-gated.
- **Live UX**: SSE for task counters, workflow status, page widget refreshes.

### Information architecture
- **Home/Dashboard**: PDP-gated widgets (My Tasks, Recent Workflows, Favorites, Announcements). Drag–drop layout, per-user saved layouts. Live counters via SSE.
- **Pages**:
  - List of available pages (PDP-filtered) with search/favorites/recent.
  - Page Runner renders `PageConfig` with: grid(s), search bar, action dock, form modals, empty/error states.
  - Contextual actions enabled only when rows selected and PDP allows.
- **Workflows**:
  - Launchpad (search/favorites/recent).
  - Workflow Runner: start (inputs/form), live status via SSE, visualization (compact), resume/cancel, result panel.
- **Tasks**:
  - Inbox: tabs (All, Assigned to me, Awaiting my approval, Overdue). Filters, bulk actions (if PDP allows), SLA cues.
  - Task Detail: summary, form/resume panel, history/audit, related items.
- **Activity**: recent runs, pages viewed, exported reports (optional).
- **Profile**: preferences (theme, language, time zone), notification settings.
- **Help**: quick tips, keyboard shortcuts.

### Authorization model (PDP)
- **Multi-level gating**:
  - Route-level: protect `/pages`, `/workflows`, `/tasks`.
  - Nav/menu: `useAuthorization` for link visibility and disabled states.
  - Widget/action-level: PDP checks on button render and on click (defense in depth).
  - Row-level: action availability per row (batch PDP with cache).
- **Caching**: short-lived PDP cache with TTL and max size; batch endpoints for lists.

### Data + realtime
- **API**: unified `api.ts` (namespaces: pages, workflows, tasks, crud, pdp).
- **SSE**: channels for `tasks/summary`, `workflow/status/:id`, `configs/stream`.
- **Query**: TanStack Query for caching, background refresh, stale-while-revalidate. Optimistic task completes where safe (quick undo).

### Authn/session
- **Guard**: session-driven guard that hits `/auth/session`; allow `/auth/*` and `/login`.
- **Callback**: `/auth/callback` polls session then navigates to `return_to`.
- **Session UX**: idle timeout prompts, cross-tab sync via BroadcastChannel, graceful re-auth.

### Runtime Page Runner (distinct from Designer)
- **Renderer**: small, production-only renderer that:
  - Handles multiple grids, simple search (plus advanced when present), pagination.
  - Action dock (general + contextual), form modals (schema-driven).
  - Minimal mermaid/visualization only in Workflow result panel; no canvas editing.
- **Empty/error**: gentle messages; retry buttons; PDP nudges when denied.

### Tasks center
- **Inbox UX**: keyboard nav, bulk select, quick filters (Overdue, High Priority, My queue).
- **Detail**: approve/complete with form; show upstream workflow breadcrumbs; audit trail.
- **Counters**: SSE-driven; low-frequency background revalidate.

### Workflow runner
- **Start**: by name or ID (resolve name); optional quick-launch presets.
- **Status**: SSE tags RUNNING/COMPLETED/FAILED; result panel; compact diagram (optional).
- **Resume**: WAITING_FOR_INPUT form; PDP check before show.

### Navigation & personalization
- **Nav**: built from BFF `/api/configs/ui` + PDP; favorites drawer; recent list.
- **Personalization**: pinned pages/workflows; saved filters; per-user dashboard layout.

### Non-functional
- **Design system**: Neon Flux only; responsive; WCAG AA.
- **Perf**: code-split per route; prefetch hover; debounce search; SSR not required.
- **Telemetry**: page views, action clicks, errors to BFF → Kafka; correlation-id propagation.
- **Security**: CSP locked, httpOnly cookies, no localStorage secrets, strict SameSite/Domain.

### Implementation delta (short)
- **Finish auth flow**: ensure `/auth/login` → IdP → `/auth/callback` → `/auth/session` true.
- **Tasks**: switch `TasksPage` to `tasksApi`, add PDP gating, counters via SSE.
- **Pages**: replace placeholders with `PreviewMode` renderer (we added minimal); wire forms/actions progressively.
- **Workflows**: keep SSE status + `ExecutionView`; add resume/cancel endpoints.
- **Nav gating**: already added; extend to route protection wrappers.
- **Batch PDP**: add `batchAuthorize` calls for lists.
- **Tests**: Playwright flows (login, pages list/run, workflow start/status, task approve).

If you want, I’ll implement the tasks page wiring (use `tasksApi`, SSE counters, PDP gating) and add route-level PDP guards next, then run the e2e smoke.