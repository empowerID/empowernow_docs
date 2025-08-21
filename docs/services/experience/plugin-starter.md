---
title: Plugin Starter (Template)
sidebar_label: Plugin Starter
description: A minimal, ready-to-adapt starter for building Experience plugins with TypeScript, esbuild, and sample tests.
---

## Folder structure

```
my-plugin/
  package.json
  tsconfig.json
  src/
    index.tsx
    HelloPage.tsx
    HelloWidget.tsx
  test/
    hello.test.ts
  dist/
    index.esm.js (build output)
```

## package.json

```json
{
  "name": "@empowernow/example-plugin",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "esbuild src/index.tsx --bundle --format=esm --platform=browser --target=es2020 --outfile=dist/index.esm.js --external:react --external:react-dom --external:@empowernow/ui",
    "test": "vitest run",
    "sbom": "cyclonedx-bom -o sbom.frontend.json || true"
  },
  "devDependencies": {
    "esbuild": "^0.21.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  },
  "peerDependencies": {
    "react": "^18",
    "react-dom": "^18",
    "@empowernow/ui": "*"
  }
}
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

## src/index.tsx

```tsx
import * as React from 'react';
import { HelloPage } from './HelloPage';
import { HelloWidget } from './HelloWidget';

export const routes = { HelloPage };
export const widgets = { HelloWidget };

export default { routes, widgets };
```

## src/HelloPage.tsx

```tsx
import * as React from 'react';

export function HelloPage() {
  return <div className="glass-card p-4">Hello Page</div>;
}
```

## src/HelloWidget.tsx

```tsx
import * as React from 'react';

export function HelloWidget() {
  return <div className="glass-card p-2">Hello Widget</div>;
}
```

## test/hello.test.ts

```ts
import { describe, it, expect } from 'vitest';

describe('example', () => {
  it('loads starter', () => {
    expect(1 + 1).toBe(2);
  });
});
```

## Build

```bash
npm ci
npm run build
```

## Place & configure

- Copy `dist/index.esm.js` to `ServiceConfigs/BFF/plugins/<id>/<version>/index.esm.js`
- Add an entry in `ServiceConfigs/BFF/config/plugins.yaml` with `bundle.file` pointing to `/app/plugins/<id>/<version>/index.esm.js`
- Set contributions and permissions; then reload manifests via `POST /api/plugins/refresh`

See also: Quickstart `./quickstart`, Types `./developer-types`, Canonical `./experience_plugins`.

