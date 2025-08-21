---
title: Experience — Executive Overview
sidebar_label: Executive Overview
description: High-level narrative for executives and product leaders — what Experience is, why it matters, how it compares, and what to demo.
---

## What it is (one paragraph)

Experience is the PDP‑aware, zero‑token React portal for the EmpowerNow Identity Fabric. It unifies pages, workflows, tasks, and approvals in one place and adds a secure plugin model so tenants can extend the product **without forking or redeploying**. All UI is authorized via OpenID AuthZEN through the BFF; no access tokens ever reach the browser.

## Why it matters (business)

- Faster delivery: tenant‑specific features ship in days, not quarters
- Lower TCO: core remains stable; plugins roll out per tenant with governance
- Safer upgrades: instant quarantine rollback; semver guard prevents breakage
- Compliance & audit: CAEP/OTEL events, PDP decisions, and strict CSP baseline

## How it’s different (technical)

- Same‑origin ESM plugins (no iframes/cross‑origin scripts)
- PDP pre‑gating on every route/widget/action; BFF enforcement on every call
- Zero tokens in the browser; session‑only with CSRF and session binding
- Observability out‑of‑the‑box (events, metrics, logs, traces)

## What to watch in the demo

- PDP‑gated nav/pages; deny → no mount; permit → visible
- Workflow launch and task completion with SSE live status
- Enable a plugin via manifest; refresh; route appears; quarantine it instantly
- Show Grafana dashboards and security headers

## Where to go deeper

- Plugin architecture (canonical): `./experience_plugins`
- Quickstart: `./quickstart`
- Security: `./security-reference`
- Ops: `./ops-runbook`


