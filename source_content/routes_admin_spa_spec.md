### BFF Routes Admin SPA Integration Spec

This document specifies the backend APIs and client integration patterns for a React SPA to manage `routes.yaml` (dynamic routing and per‑route token policy).

#### Auth and Security

- All endpoints require an authenticated admin session at the BFF.
- Gate writes with PDP or your chosen admin guard in deployment (route is mounted under `/api/admin`).
- Never send secrets; responses redact sensitive values.

#### Base URL

- All endpoints are under `/api/admin`.

### Data model (summary)

- `RoutesConfiguration` (JSON) mirrors `routes.yaml`:
  - `version: string`
  - `description: string`
  - `services: { [name]: { base_url: string, timeout: number } }`
  - `routes: Array<RouteConfig>`
- `RouteConfig`:
  - `id: string`
  - `description?: string`
  - `path: string` (e.g., `/api/crud/forms/*`)
  - `target_service: string` (key from `services`)
  - `upstream_path: string` (may include `{path}` placeholder)
  - `methods: string[]` (`GET`, `POST`, etc.)
  - `auth: "none" | "session" | "bearer"`
  - `authz?: "pdp" | "none"`
  - `authz_map?: { [method]: { resource: string, action: string, id_from?: string, props?: object } }`
  - `streaming?: boolean`
  - `preserve_path?: boolean`
  - `token_policy?: { mode: "session_passthrough" | "service_token" | "on_behalf_of", service?: string, audience?: string, scopes?: string[], cache_ttl?: number }`

### Caching and Revalidation (SPA UX)

- All read endpoints return both `ETag` and `Last-Modified` headers.
- Send `If-None-Match` and `If-Modified-Since` on GETs. Server returns `304 Not Modified` when unchanged.
- Cache-Control: `public, max-age=60` for list/detail views.
- Implement a short SWR window (5–10s): show cached data immediately, revalidate in background.

### Endpoints

1) GET `/api/admin/routes` — full configuration

- Purpose: editor loads, export/import, full validation preview.
- Headers (request):
  - `If-None-Match: <etag>` (optional)
  - `If-Modified-Since: <rfc1123-date>` (optional)
- Responses:
  - `200` JSON body = full `RoutesConfiguration` + headers `ETag`, `Last-Modified`, `Cache-Control`.
  - `304` no body when unchanged (use cached copy).

2) GET `/api/admin/routes/summary` — lean list view

- Response body:
  ```json
  {
    "items": [
      {
        "id": "crud-forms",
        "path": "/api/crud/forms/*",
        "methods": ["GET","POST","PUT","DELETE","OPTIONS"],
        "service": "crud_service",
        "auth": "session",
        "has_token_policy": true
      }
    ]
  }
  ```
- Includes `ETag`, `Last-Modified`, `Cache-Control`.

3) GET `/api/admin/routes/{route_id}` — route detail

- Returns one `RouteConfig` with validators headers.

4) POST `/api/admin/routes/validate` — validate proposed config

- Request body: full `RoutesConfiguration` JSON (what you intend to save).
- Response:
  - `200 { valid: true, routes_count: number, services_count: number, warnings: string[] }`
  - `400 { valid: false, error: string }`

5) POST `/api/admin/routes/diff` — semantic diff vs current

- Request body: full `RoutesConfiguration` JSON.
- Response: `{ diff: string[] }` unified diff (first 2000 lines).

6) POST `/api/admin/routes/simulate` — preview match and policy

- Request body: `{ method: "GET" | "POST" | ..., path: string }`
- Response:
  ```json
  {
    "route_id": "crud-workflows-exact",
    "service": "crud_service",
    "upstream_path": "/workflows",
    "upstream_url": "http://crud-service:8000/workflows",
    "token_policy": {"mode":"service_token","service":"crud_service","audience":"https://crud.ocg.labs.empowernow.ai/api","scopes":["api.read"]}
  }
  ```

7) PUT `/api/admin/routes` — save (atomic) with precondition

- Request headers: `If-Match: <etag-from-last-read>` (required when present).
- Body: full `RoutesConfiguration` JSON.
- Response: `200 { ok: true, reloaded: boolean }` with new `ETag`, `Last-Modified`, `Cache-Control`.
- Behavior: validates → write to `config/routes.yaml` atomically → attempt hot‑reload.

8) POST `/api/admin/routes/reload` — hot‑reload current file

- Response: `{ ok: true, summary: {...} }` or `503 dynamic_router_unavailable`.

### Client SWR helper (TypeScript snippet)

```ts
export async function fetchAdmin<T>(path: string): Promise<T> {
  const url = `/api/admin${path}`;
  const key = `GET:${url}`;
  const cache = (globalThis as any).__apiCache || ((globalThis as any).__apiCache = new Map());
  const cached = cache.get(key) as { etag?: string; lastModified?: string; value: T; fetchedAt: number } | undefined;
  const swrMs = 10_000;

  const headers: Record<string,string> = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;
  if (cached?.lastModified) headers['If-Modified-Since'] = cached.lastModified;

  if (cached && Date.now() - cached.fetchedAt < swrMs) {
    void (async () => {
      const r = await fetch(url, { headers, credentials: 'include' });
      if (r.status === 304) return;
      const value = await r.json();
      cache.set(key, { etag: r.headers.get('etag') || undefined, lastModified: r.headers.get('last-modified') || undefined, value, fetchedAt: Date.now() });
    })();
    return cached.value;
  }

  const r = await fetch(url, { headers, credentials: 'include' });
  if (r.status === 304 && cached) return cached.value;
  const value = await r.json();
  cache.set(key, { etag: r.headers.get('etag') || undefined, lastModified: r.headers.get('last-modified') || undefined, value, fetchedAt: Date.now() });
  return value;
}
```

### Editor workflow (recommended)

1. Load list: `GET /api/admin/routes/summary` (SWR, 304 aware).
2. Select route → `GET /api/admin/routes/{id}`.
3. Edit in form (hydrate `token_policy`, `authz_map`). Provide service name choices from `services`.
4. Preview: `POST /api/admin/routes/simulate` to verify upstream URL and token policy.
5. Validate whole file (after merging edit): `POST /api/admin/routes/validate`.
6. Diff for review: `POST /api/admin/routes/diff`.
7. Save: `PUT /api/admin/routes` with `If-Match` from last read.
8. Reload: `POST /api/admin/routes/reload` (show summary).

### UX and schema guidance

- Lists should show minimal columns: `id`, `path`, `methods`, `service`, `auth`, `token_policy.mode`.
- Detail form fields:
  - Required: `id`, `path`, `target_service`, `upstream_path`, `methods`, `auth`.
  - Optional toggles: `authz` (=pdp), `streaming`, `preserve_path`.
  - Token policy editor (mode + service + audience + scopes + cache_ttl).
  - AuthZ map editor (method → resource/action).
- Validate on input (id format, path starts with `/`, methods, auth types).

### Errors

- `400 validation_failed`: invalid shapes or enums.
- `404`: route not found.
- `412 precondition_failed`: stale `If-Match`.
- `500 write_failed` or generic server error.

### Observability

- Back end emits payload sizes and 304 counts. Front end should log cache hits/misses at debug level for QA runs.

### Rollout checklist

- Wire SPA admin UI to these endpoints.
- Enable admin PDP guard for writes in deployment.
- Monitor 304 rates and page navigation timings; confirm SWR behavior.


