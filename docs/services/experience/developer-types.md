---
title: TypeScript Types (Plugins)
sidebar_label: TypeScript Types
description: Reference TypeScript interfaces for plugin manifests, loader outputs, and the host SDK surface.
---

## Plugin manifest

```ts
export interface PluginPermission {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string; // method+path template; supports param shapes (e.g., {uuid})
}

export interface PluginContributions {
  routes?: Array<{
    path: string;
    component: string;
    resource: 'plugin.route';
    action: 'view';
  }>;
  widgets?: Array<{
    slot: string; // e.g., 'dashboard.main'
    component: string;
    resource: 'plugin.widget';
    action: 'view';
  }>;
}

export interface PluginManifest {
  id: string;
  version: string;
  engine?: { experience?: string }; // semver range
  permissions?: { api?: PluginPermission[]; sse?: string[] };
  contributions?: PluginContributions;
}
```

## Loaded plugin (loader)

```ts
export interface LoadedPlugin {
  id: string;
  manifest: PluginManifest;
  routes: Record<string, React.ComponentType<any>>;
  widgets: Record<string, React.ComponentType<any>>;
}
```

## Host SDK surface

```ts
export interface PluginSDK {
  api: {
    fetch: (path: string, init?: RequestInit) => Promise<Response>;
    useQuery<T>(key: string[], fn: () => Promise<T>): { data?: T; isLoading: boolean; error?: unknown };
  };
  sse: {
    subscribe: (path: string, onMessage: (data: any) => void) => () => void;
  };
  authz: {
    evaluate: (resource: { type: string; id: string }, action: { name: string }) => Promise<boolean>;
  };
  logger: { debug: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
  telemetry: { fireAndForget: (path: string, body?: any) => void };
}
```

See also: Quickstart `./quickstart`, Primer `./plugins`, Canonical reference `./experience_plugins`.

