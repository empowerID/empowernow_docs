---
title: Permission Gating in the UI
---

What this covers

- How to gate pages/routes and specific components in the SPA, while the real authorization decision remains on the server (PDP via the BFF).
- Practical, copy‑pasteable examples using `@empowernow/bff-auth-react` and a simple “capabilities” endpoint pattern.

Key principles

- Do not parse tokens on the client. The BFF enforces authorization with the PDP.
- UI gating is a user‑experience optimization (hide/disable). Always keep server‑side authorization as the source of truth.

Route gating (pages)

```tsx
// src/components/auth/AuthGuard.tsx
import { useAuth } from '@empowernow/bff-auth-react'
import { PropsWithChildren } from 'react'

export function AuthGuard({ children }: PropsWithChildren) {
  const { isAuthenticated, isLoading, login } = useAuth()
  if (isLoading) return null
  if (!isAuthenticated) {
    login() // or navigate('/login') depending on SDK
    return null
  }
  return <>{children}</>
}
```

```tsx
// src/App.tsx (React Router)
<Route
  path="/admin"
  element={
    <AuthGuard>
      <AdminPage />
    </AuthGuard>
  }
/>
```

Component‑level gating (buttons/menus)

Pattern A: Capabilities endpoint (recommended)

- Backend exposes a same‑origin endpoint like `GET /api/me/capabilities?resource=crud:workflows` that returns allowed actions for the current user. This can be implemented in your BFF or service layer using PDP mappings.

Example response

```json
{
  "resource": "crud:workflows",
  "actions": ["read", "create", "update"]
}
```

Example hook and usage

```tsx
// src/hooks/usePermission.ts
import { useEffect, useState } from 'react'
import { fetchWithAuth } from '@empowernow/bff-auth-react'

type CapabilityCache = Record<string, Set<string>>
const cache: CapabilityCache = {}

export function usePermission(resource: string, action: string) {
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (cache[resource]) {
        setAllowed(cache[resource].has(action))
        return
      }
      try {
        const res = await fetchWithAuth(`/api/me/capabilities?resource=${encodeURIComponent(resource)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const set = new Set<string>(data.actions || [])
        cache[resource] = set
        if (!cancelled) setAllowed(set.has(action))
      } catch {
        if (!cancelled) setAllowed(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [resource, action])

  return { allowed, isLoading: allowed === null }
}

// Usage in a component
function CreateWorkflowButton() {
  const { allowed, isLoading } = usePermission('crud:workflows', 'create')
  if (isLoading) return null
  if (!allowed) return null // or return <Button disabled>...
  return <button>Create workflow</button>
}
```

Pattern B: “Probe” a backend endpoint (fallback)

- For actions that map 1:1 to an API route, you can issue a lightweight check (e.g., `OPTIONS`/`HEAD` or a dry‑run `POST` if supported) and treat `403` as “not allowed”. This requires the backend to implement such probes and is less efficient than a capabilities endpoint.

Designing the capabilities endpoint (backend)

- Use PDP mapping (`pdp.yaml:endpoint_map`) to translate requested resource/actions into PDP decisions for the current user.
- Cache results briefly for performance (e.g., 30–60s per resource per user).
- Keep the response small and composable by frontends.

Do and don’t

- Do: hide or disable controls based on capability checks; always handle server 403/401 gracefully.
- Don’t: embed permission logic or token parsing in the client.

Related topics

- Explanation → Authorization Model (PDP, Mapping, Caching)
- Reference → routes.yaml Reference
- How‑to → PDP mapping for APIs


