---
title: Experience Plugin System
sidebar_label: Plugins
---

This page distills and formalizes the Experience plugin content into a production‑ready reference.

## Goals

- Secure, extensible end‑user pages/widgets integrated into Experience SPA
- Same‑origin ESM bundles via BFF proxy (CSP `script-src 'self'`)
- Server‑side enforcement by BFF of per‑plugin permissions

## High‑level flow

```mermaid
sequenceDiagram
  autonumber
  participant UI as Experience SPA
  participant B as BFF
  participant R as Registry
  participant P as Plugin Bundle

  UI->>B: GET /api/plugins/manifests
  B->>R: Fetch manifests
  R-->>B: manifests[]
  B-->>UI: manifests[]
  loop per manifest
    UI->>B: import /api/plugins/bundle?entry=...&id=...
    B-->>UI: ESM bundle (CSP safe)
    UI->>UI: resolve manifest.contributions to plugin.routes/widgets
  end
```

## Contract

- Manifest
  - `id`, `version`, `engine.experience` (semver range)
  - `contributions.routes[{ path, component }]`, `contributions.widgets[{ slot, component }]`
  - `permissions.api[{ method, path }]`, `permissions.sse[string]`
- Runtime loader
  - Discovery: `/api/plugins/manifests`
  - Bundle import: `/api/plugins/bundle?entry=<url>&id=<pluginId>`
  - Resolve `manifest` → `plugin.routes/widgets` records
- SDK (per plugin)
  - `api.fetch`, `api.useQuery`, `sse.subscribe`, `authz.evaluate`, `logger`, `telemetry`
  - Stamps `X-Plugin-Id` on every request

## BFF enforcement (required)

- Allow‑list per plugin id: method + path prefixes
- Require `X‑Plugin‑Id`; attach tenant/context; rate‑limit per plugin
- SSE: only declared channels; close unauthorized streams

```mermaid
flowchart TD
  A[Request from plugin] --> H[Has X-Plugin-Id?]
  H -->|no| F[403]
  H -->|yes| L[Check allow-list method+path]
  L -->|deny| F
  L -->|allow| U[Upstream -> service]
```

## CSP & routing

- CSP remains strict: only same‑origin scripts via BFF bundle proxy
- Traefik SPA router excludes `/api/`, `/auth/`, `/events/`, `/configs/stream`, `/stream/`

## DX

- Simple SDK; clear errors; telemetry hooks
- Dev mode (optional): allow localhost plugin URLs only in development

## Testing

- Unit: loader resolution, SDK stamps header
- E2E: hello‑plugin renders; 403 without `X‑Plugin-Id`; widget slot; SSE gated

## Appendices

- Performance caching in loader, telemetry example, health endpoints, migration helper, plugin harness checks

See also: Experience React App — Overview & Spec, BFF routes and middleware.

## Reference snippets (ready to drop in)

Loader with base URL and caching:

```typescript
// src/plugins/loader.ts
import type { LoadedPlugin, PluginManifest } from './types';

export class PluginRegistry {
  private loaded = new Map<string, LoadedPlugin>();
  private bundleCache = new Map<string, Promise<any>>();

  async discover(): Promise<PluginManifest[]> {
    const base = (import.meta as any).env?.VITE_BFF_BASE_URL || '';
    const res = await fetch(`${base}/api/plugins/manifests`, { credentials: 'include' });
    return res.json();
  }

  private importBundle(url: string) {
    if (!this.bundleCache.has(url)) {
      this.bundleCache.set(url, import(/* @vite-ignore */ url));
    }
    return this.bundleCache.get(url)!;
  }

  async load(manifest: PluginManifest): Promise<LoadedPlugin> {
    const base = (import.meta as any).env?.VITE_BFF_BASE_URL || '';
    const url = `${base}/api/plugins/bundle?entry=${encodeURIComponent(manifest.id)}&id=${encodeURIComponent(manifest.id)}`;
    const mod = await this.importBundle(url);
    const plugin: LoadedPlugin = {
      id: manifest.id,
      manifest,
      routes: mod.default?.routes ?? mod.routes ?? {},
      widgets: mod.default?.widgets ?? mod.widgets ?? {},
    };
    this.loaded.set(manifest.id, plugin);
    return plugin;
  }

  getLoaded() { return Array.from(this.loaded.values()); }
}
```

Shared registry and PDP‑gated routes:

```typescript
// src/plugins/registry.ts
import type { LoadedPlugin, PluginManifest } from './types';
import { PluginRegistry } from './loader';

let cached: Promise<LoadedPlugin[]> | null = null;
export function getLoadedPlugins(): Promise<LoadedPlugin[]> {
  if (cached) return cached;
  const reg = new PluginRegistry();
  cached = (async () => {
    const manifests: PluginManifest[] = await reg.discover();
    return Promise.all(manifests.map(m => reg.load(m)));
  })();
  return cached;
}

// src/plugins/DynamicRoutes.tsx (excerpt)
const routeGuard = useAuthorization('plugin.route', 'view', true);
useEffect(() => {
  (async () => {
    const plugins = await getLoadedPlugins();
    const routes = plugins
      .flatMap(p => (p.manifest.contributions?.routes || []).map(r => ({
        path: r.path,
        element: routeGuard.authorized ? React.createElement(p.routes?.[r.component] || (() => null)) : null
      })))
      .filter(r => r.element);
    setElements(routes);
  })();
}, []);
```

Dashboard widgets from plugins:

```typescript
// src/pages/Dashboard.tsx (excerpt)
import { getLoadedPlugins } from '../plugins/registry';

useEffect(() => {
  (async () => {
    const plugins = await getLoadedPlugins();
    const widgets = plugins.flatMap(p => Object.entries(p.widgets || {}).map(([name, Comp]) => ({
      id: `${p.id}:${name}`,
      title: name,
      resource: 'plugin.widget',
      action: 'view',
      render: () => <Comp />,
    })));
    setPluginWidgets(widgets);
  })();
}, []);
```

Plugin SDK with stamped requests and SSE:

```typescript
// src/plugins/sdk.ts (excerpt)
export function createPluginSdk(pluginId: string, qc: QueryClient) {
  const base = (import.meta as any).env?.VITE_BFF_BASE_URL || '';
  const apiFetch = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${base}/api${path.startsWith('/') ? path : '/' + path}` , {
      ...(init || {}),
      credentials: 'include',
      headers: { 'X-Plugin-Id': pluginId, ...(init?.headers || {}) }
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return res;
  };
  const subscribe = (path: string, onMessage: (data: any) => void) => {
    const url = `${base}/api${path}`;
    const es = new EventSource(url, { withCredentials: true } as any);
    es.onmessage = (e) => onMessage(JSON.parse(e.data));
    return () => es.close();
  };
  return { /* api, sse, authz ... as described above */ };
}
```

## Gating flow (visual)

```mermaid
flowchart TD
  M[Manifest loaded] --> R[Routes/widgets resolved]
  R --> G{Authorized? (PDP)}
  G -->|no| H[Hide route/widget]
  G -->|yes| S[Show in SPA]
  S --> C[Calls carry X-Plugin-Id]
  C --> E[Enforced by BFF allow-lists]
```


