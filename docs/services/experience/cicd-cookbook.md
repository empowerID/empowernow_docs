---
title: CI/CD Cookbook (Experience Plugins)
sidebar_label: CI/CD Cookbook
description: End-to-end pipeline examples for building bundles, computing integrity, updating plugins.yaml, reloading BFF, smoke testing, and rollback.
---

## GitHub Actions (example)

```yaml
name: plugin-deploy
on:
  workflow_dispatch:
  push:
    branches: [ main ]
    paths:
      - 'plugins/hello/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Build ESM bundle
        working-directory: plugins/hello
        run: |
          npm ci
          npm run build # produces dist/index.esm.js
          npm run sbom || true # optional CycloneDX
      - name: Compute integrity
        run: |
          mkdir -p ServiceConfigs/BFF/plugins/hello/1.0.0
          cp plugins/hello/dist/index.esm.js ServiceConfigs/BFF/plugins/hello/1.0.0/index.esm.js
          echo "sha256-$(sha256sum ServiceConfigs/BFF/plugins/hello/1.0.0/index.esm.js | cut -d' ' -f1)" > integrity.txt
      - name: Update plugins.yaml
        run: |
          INTEGRITY=$(cat integrity.txt)
          yq -i \
            '(.tenants["experience.ocg.labs.empowernow.ai"][0].bundle.file) = "/app/plugins/hello/1.0.0/index.esm.js" |
             (.tenants["experience.ocg.labs.empowernow.ai"][0].bundle.integrity) = strenv(INTEGRITY)' \
            ServiceConfigs/BFF/config/plugins.yaml
      - name: Commit config
        run: |
          git config user.name "ci"
          git config user.email "ci@example"
          git add ServiceConfigs/BFF/**
          git commit -m "chore(plugins): deploy hello 1.0.0 with integrity"
          git push
      - name: Reload manifests
        run: |
          curl -sS -X POST https://experience.ocg.labs.empowernow.ai/api/plugins/refresh --cookie "bff_session=${{ secrets.BFF_SESSION }}"
      - name: Smoke tests
        run: |
          set -e
          curl -sS https://experience.ocg.labs.empowernow.ai/api/plugins/manifests --cookie "bff_session=${{ secrets.BFF_SESSION }}" | jq .
          curl -sS -I "https://experience.ocg.labs.empowernow.ai/api/plugins/bundle?entry=hello&id=hello" --cookie "bff_session=${{ secrets.BFF_SESSION }}" | tee headers.txt
          grep -E "^ETag:|^Cache-Control:|^X-Content-Type-Options:|^Cross-Origin-Resource-Policy: same-origin" headers.txt
      - name: Rollback on failure
        if: failure()
        run: |
          curl -sS -X POST https://experience.ocg.labs.empowernow.ai/api/plugins/quarantine/hello --cookie "bff_session=${{ secrets.BFF_SESSION }}"
```

## Azure DevOps (snippet)

```yaml
trigger:
  branches: { include: [ main ] }
pool: { vmImage: ubuntu-latest }
steps:
  - task: NodeTool@0
    inputs: { versionSpec: '20.x' }
  - script: |
      npm ci && npm run build && npm run sbom || true
    workingDirectory: plugins/hello
  - script: |
      mkdir -p ServiceConfigs/BFF/plugins/hello/1.0.0
      cp plugins/hello/dist/index.esm.js ServiceConfigs/BFF/plugins/hello/1.0.0/index.esm.js
      echo "sha256-$(sha256sum ServiceConfigs/BFF/plugins/hello/1.0.0/index.esm.js | cut -d' ' -f1)" > integrity.txt
      INTEGRITY=$(cat integrity.txt)
      yq -i "(.tenants[\"experience.ocg.labs.empowernow.ai\"][0].bundle.integrity) = strenv(INTEGRITY)" ServiceConfigs/BFF/config/plugins.yaml
    displayName: "Place bundle & set integrity"
```

## Atomic deploy pattern

```bash
# Stage new version
cp dist/index.esm.js ServiceConfigs/BFF/plugins/hello/.staged/1.0.1/index.esm.js
# Flip symlink atomically
ln -sfn /app/plugins/hello/.staged/1.0.1 /app/plugins/hello/1.0.1
```

## Smoke tests (curl)

```bash
curl -sS https://experience.../api/plugins/manifests --cookie "bff_session=..."
curl -sS -I "https://experience.../api/plugins/bundle?entry=hello&id=hello" --cookie "bff_session=..."
```

See also: Ops Runbook `./ops-runbook`, Monitoring & Alerts `./monitoring-alerts`.

