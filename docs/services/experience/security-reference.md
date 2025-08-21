---
title: Plugins Security Reference
sidebar_label: Plugins Security Reference
description: CSP, Permissions-Policy, Trusted Types (report-only), Vary headers, and same-origin ESM model for Experience plugins.
---

## CSP (strict)

`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; require-trusted-types-for 'script'; trusted-types react empowernow-sdk;`

## Permissions-Policy (deny-by-default)

`accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()`

## Trusted Types (report-only)

- Enabled in report-only mode to surface unexpected sinks early without break risk
- Configure report endpoint when ready; track and remediate violations

## Vary headers

- `Vary: Cookie, X-Plugin-Id` on manifests and bundles ensures correct caching per session/plugin

## Same-origin ESM

- Bundles imported from `/api/plugins/bundle` keep CSP intact; no external scripts or globals
- Root-jail for bundles at `/app/plugins`; optional integrity hash (`sha256`) enforced by BFF

See also: Canonical plugin reference `./experience_plugins`, Ops Runbook `./ops-runbook`.

