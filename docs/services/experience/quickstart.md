---
title: Plugins Quickstart (Build → Place → Configure → Deploy → Verify)
sidebar_label: Plugins Quickstart
description: Step-by-step process to build a plugin, place the bundle, configure the manifest, deploy via BFF mounts, and verify.
---

This quickstart condenses §16 (Development Process) from the canonical reference `./experience_plugins`.

## 1) Build

- Author routes and/or widgets and export as ESM
- Externalize `react`, `react-dom`, and `@empowernow/ui`
- Produce a single file bundle (e.g., `dist/index.esm.js`)

esbuild (CLI):

```bash
npx esbuild src/index.tsx --bundle --format=esm --platform=browser --target=es2020 \
  --outfile=dist/index.esm.js \
  --external:react --external:react-dom --external:@empowernow/ui
```

rollup (config):

```javascript
// rollup.config.mjs
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import esbuild from 'rollup-plugin-esbuild';

export default {
  input: 'src/index.tsx',
  external: ['react', 'react-dom', '@empowernow/ui'],
  output: { file: 'dist/index.esm.js', format: 'esm' },
  plugins: [resolve({ browser: true }), commonjs(), esbuild({ jsx: 'automatic', target: 'es2020' })],
};
```

## 2) Place

Copy the bundle to:

```
ServiceConfigs/BFF/plugins/<pluginId>/<version>/index.esm.js
```

## 3) Configure

Add an entry in `ServiceConfigs/BFF/config/plugins.yaml`:

```yaml
tenants:
  experience.ocg.labs.empowernow.ai:
    - id: hello
      version: "1.0.0"
      engine: { experience: ">=1.0.0" }
      bundle: { file: "/app/plugins/hello/1.0.0/index.esm.js" }
      permissions:
        api:
          - { method: GET, path: /api/plugins/secure-echo }
        sse: []
      contributions:
        routes:
          - { path: /hello, component: Hello, resource: plugin.route, action: view }
```

## 4) Deploy

Ensure BFF mounts in compose:

```
../ServiceConfigs/BFF/plugins:/app/plugins:ro
../ServiceConfigs/BFF/config:/app/config:ro
```

Restart/reload the BFF.

## 5) Verify

- `GET /api/plugins/manifests` lists your plugin
- SPA imports `/api/plugins/bundle?entry=hello&id=hello` with 200 and caching headers
- Contributions render when PDP allows

See also: Storage & Deployment `./plugins-storage-deployment`, canonical reference `./experience_plugins`, and BFF routing `../bff/devops/experience_routing`.

