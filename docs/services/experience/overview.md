---
title: Experience React App — Overview & Spec
sidebar_label: React App (Spec)
---

This page consolidates the EmpowerNow React App specifications for the Experience end‑user portal and adapts them for operational reference.

## Architecture

- React 18 + TypeScript 5, Vite build, Nginx static hosting
- Design system: `@empowernow/ui` (Neon Flux)
- Auth: `@empowernow/bff-auth-react`; OAuth/OIDC flows terminate at the BFF
- Transport: all requests via BFF `/api/**`; SSE for realtime

```mermaid
flowchart LR
  UI[Experience SPA] -->|/api (cookie)| BFF[BFF]
  UI -->|/auth| BFF
  BFF -->|/access/v1| PDP[PDP]
  BFF -->|Bearer server| SVC[Services]
  BFF -->|/oidc| IDP[IdP]
```

Key guidance:

- Same‑origin preferred; set `VITE_BFF_BASE_URL` empty and use relative `/api`
- Never call services directly; route through BFF for authZ and policy

## Dependencies

- Required: `react`, `react-dom`, `react-router-dom@7`, `@empowernow/ui`, `@empowernow/bff-auth-react`, `@tanstack/react-query`, `axios`
- Optional: `@empowernow/common`, `monaco-editor`, `zod`/`ajv`

## Configuration (Vite)

- `VITE_OIDC_AUTHORITY`, `VITE_OIDC_CLIENT_ID`, `VITE_OIDC_SCOPE`, optional `VITE_OIDC_RESOURCE`
- `VITE_BFF_BASE_URL` (empty for same‑origin)

## Authentication & Session

- Wrap app with `BffAuthProvider`
- BFF manages session cookie; browser never sees tokens
- Check `/api/auth/session` on load/focus; login via BFF

## API access pattern

- Axios instance with `withCredentials: true`, base `/api`
- TanStack Query for caching/invalidation
- Prefer SSE for live counters/events

## Build & Deployment

- Build to `dist/`; Nginx SPA fallback (`try_files`)
- Traefik routes exclude `/api/`, `/auth/`, streaming paths from SPA router
- BFF owns `/api/**` and `/auth/**`

## Security & PDP

- No direct service URLs; cookie‑only
- PDP everywhere: route/menu/widgets/actions gated via BFF PDP endpoints

See also: Experience Plugins, Handover checklist.


