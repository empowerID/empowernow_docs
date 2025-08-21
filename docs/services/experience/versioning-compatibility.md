---
title: Plugins Versioning & Compatibility
sidebar_label: Plugins Versioning & Compatibility
description: Semver guard via engine.experience, stable contracts, and guard behaviors for Experience plugins.
---

## Guard via `engine.experience`

- Plugins declare a host compatibility range; the host enforces at runtime
- Example: `{ "engine": { "experience": ">=1.2.0 <2.0.0" } }`

## Stable contracts

- Manifest: `id`, `version`, `engine.experience`, `contributions.routes/widgets`, `permissions.api/sse`
- Bundle exports: `routes`, `widgets` (React components)
- SDK surface: `api.fetch`, `sse.subscribe`, `authz.evaluate` (same-origin, credentials, `X-Plugin-Id`)
- PDP naming: `plugin.route:view`, `plugin.widget:view`

## Guard behavior

- Not satisfied ⇒ skip import, omit contributions, log diagnostic (optional dev banner off‑prod)
- Near boundary/pre‑release ⇒ allow with warning

## Change policy

- Additive: new optional manifest fields, optional SDK methods, new slots
- Breaking: removing/renaming manifest keys, required type/semantic changes, removing SDK methods, changing PDP semantics

See also: Canonical plugin reference `./experience_plugins`.

