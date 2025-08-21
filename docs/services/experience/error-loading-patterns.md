---
title: Error & Loading Patterns (Plugins)
sidebar_label: Error & Loading Patterns
description: Recommended UX patterns for denied PDP decisions, failed imports, and network errors; with sample code.
---

## Patterns

- PDP deny → hide affordance or show disabled with tooltip; log decision id for audit
- Import failure → render `PluginErrorBoundary` fallback; show retry and link to status
- Network error → exponential backoff; show toast with correlation id; log

## Samples

Denied affordance (button):

```tsx
const { authorized, loading } = useAuthorization('plugin.widget', 'view');
if (loading) return <Skeleton />;
return (
  <Tooltip title={!authorized ? 'Not authorized' : ''}>
    <Button disabled={!authorized}>Run</Button>
  </Tooltip>
);
```

Error boundary for plugin routes:

```tsx
function PluginErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => (
      <div className="glass-card p-4">
        <h4>We couldn't load this plugin.</h4>
        <div className="text-dim">{String(error)}</div>
        <Button onClick={resetErrorBoundary}>Retry</Button>
      </div>
    )}>
      {children}
    </ErrorBoundary>
  );
}
```

Import with backoff:

```ts
async function importWithBackoff(url: string, attempts = 3) {
  let delay = 500;
  for (let i = 0; i < attempts; i++) {
    try { return await import(/* @vite-ignore */ url); } catch (e) {
      if (i === attempts - 1) throw e;
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}
```

See also: Quickstart `./quickstart`, Primer `./plugins`, Canonical reference `./experience_plugins`.

