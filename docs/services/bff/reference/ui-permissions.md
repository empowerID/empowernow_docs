---
title: Permission Gating in the UI
---

Current state (verified)

- Both SPAs import `EmpowerNowProvider` shim that re-exports `@empowernow/bff-auth-react`. A `usePermission` placeholder currently returns `true` in `shims/empowernow-react.tsx`.

Guidance

- Gate routes with `AuthGuard`.
- For per-button/menu gating, add app-specific checks backed by PDP-derived claims if you expose them, or call backend “can I” endpoints if available.
- Avoid client-side token parsing; rely on backend authorization via PDP for the actual decision.

Future

- When a real `usePermission` is introduced, update this page with its shape and usage examples.


