---
title: Performance Budgets & Tips (Plugins)
sidebar_label: Performance Budgets
description: Size targets and practical guidance for keeping plugins fast.
---

## Targets (guidance)

- Widget bundle: < 50 KB gzipped
- Page bundle: < 100 KB gzipped
- First render: < 1s on baseline hardware

## Tips

- Dynamic import for heavy components; lazy routes
- Memoize expensive trees; virtualize long lists
- Prefer lightweight charts/libs; tree‑shakable ESM only
- Cache data with React Query; tune stale times per view

## Checks

- Add a build step to report bundle sizes; fail CI on regressions
- Measure with Lighthouse or RUM in staging before rollout

See also: Quickstart `./quickstart`, Error & Loading Patterns `./error-loading-patterns`.

## AI Spend – Effective Budgets (UI integration)

- Fetch counters from Analytics first; when `limit_usd` is null, call the PDP Effective Budgets endpoint via the BFF to render the policy‑derived effective limit and remaining.

```mermaid
sequenceDiagram
  participant UI as SPA
  participant B as BFF
  participant P as PDP
  participant A as Analytics
  UI->>A: GET /api/v1/analytics/budgets/state
  alt limit_usd null
    UI->>B: GET /access/v1/budgets/effective
    B->>P: GET /access/v1/budgets/effective
    P->>A: GET budgets/state
    A-->>P: counters + overrides
    P-->>B: snapshot (effective)
    B-->>UI: 200 JSON
  end
```

See also: `services/pdp/reference/effective-budgets.md`.

