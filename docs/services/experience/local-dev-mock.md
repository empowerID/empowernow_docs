---
title: Local Dev — Mock Manifests & Bundles
sidebar_label: Local Dev Mocks
description: Develop plugins locally by mocking plugin manifests and bundles without changing the host app.
---

## Mock server (minimal)

```js
// mock-plugins.mjs
import http from 'node:http';

const manifests = [{ id: 'hello', version: '1.0.0', contributions: { routes: [{ path: '/hello', component: 'Hello', resource: 'plugin.route', action: 'view' }], widgets: [] }, permissions: { api: [], sse: [] } }];

http.createServer((req, res) => {
  if (req.url.startsWith('/api/plugins/manifests')) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(manifests));
    return;
  }
  if (req.url.startsWith('/api/plugins/bundle')) {
    res.setHeader('Content-Type', 'text/javascript');
    res.end(`export const routes={Hello:()=>React.createElement('div',null,'Hello (mock)')}; export default {routes};`);
    return;
  }
  res.statusCode = 404; res.end('not found');
}).listen(8089);
```

Run: `node mock-plugins.mjs` and set the Experience SPA `VITE_BFF_BASE_URL=http://localhost:8089` for local testing.

See also: Quickstart `./quickstart`, Primer `./plugins`.

