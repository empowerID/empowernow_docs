---
title: Security & Compliance Addendum (Experience)
sidebar_label: Security & Compliance
description: Threat model, control crosswalk, event dictionary, enforcement playbooks, signing/provenance, rate limits, and Trusted Types roadmap.
---

## Threat model (STRIDE summary)

- Spoofing: mitigated by session‑only auth (httpOnly, Secure, SameSite); PDP subject normalization; `X-Plugin-Id` required
- Tampering: bundles are same‑origin and served read‑only from `/app/plugins`; optional integrity hash (`sha256`); allow‑lists compiled and normalized
- Repudiation: CAEP‑style events + OTEL spans; correlation IDs; decision logs in PDP
- Information disclosure: PDP pre‑gating; BFF allow‑lists; no tokens in browser; strict CSP; CORP same‑origin
- DoS: rate limiting per plugin; SSE prefixes gated; quarantine kill switch
- Elevation of privilege: AuthZEN decisions on every affordance; per‑plugin allow‑lists; subject isolation via provider‑namespaced ARNs

## Control crosswalk (indicative)

- NIST 800‑53: AC‑3 (PDP at BFF), AC‑6 (least privilege: per‑plugin allow‑lists), AU‑2/12 (events/logs), SC‑8 (TLS), SC‑23 (session authenticity), SI‑10 (input validation via path templates)
- SOC2 CC6/CC7: logical access controls (PDP), change management (plugins.yaml PRs; hot reload), monitoring (metrics/logs), incident response (quarantine playbook)

## Event dictionary (minimum)

- PluginServed: `{tenant, plugin_id, version, etag, bytes, latency_ms}`
- PluginDenied: `{tenant, plugin_id, reason: allowlist|quarantine|integrity, path, method}`
- QuarantineChanged: `{tenant, plugin_id, status: on|off, actor}`
- PDPDecision: `{subject, resource, action, decision, obligations, latency_ms}`

Emit as: Kafka events + OTEL spans/attributes. Consider CAEP categories for authz/extension events.

## Enforcement playbooks

- Quarantine: `POST /api/plugins/quarantine/{id}` → verify blocks; communicate; diagnose; unquarantine when fixed
- Integrity failure: 409 + `X-Integrity-Error: 1` → roll back to prior bundle (atomic flip); recompute hash; PR fix
- Allow‑list abuse: 403 + `X-Allowlist-Violation: 1` → audit calls; adjust templates; add tests; consider rate limit tightening

## Signing & provenance (policy)

- Today: optional `bundle.integrity: sha256:<hex>`; recommend enabling in prod
- Roadmap: adopt SLSA‑style provenance; sign bundles (e.g., cosign); BFF verification flow: warn‑only → enforce on signature failure

## Rate limiting & quotas (defaults)

- Per‑plugin rate limit (API): start 60 RPM, burst 30; adjust per tenant
- SSE channels: limit concurrent streams per plugin (e.g., 2)

## Trusted Types roadmap

- Current: report‑only; configure report endpoint and triage
- Hardened tiers: move to `require-trusted-types-for 'script'` enforce; inventory sinks; publish migration notes

See also: Ops Runbook `./ops-runbook`, API Reference `./api-reference`, Security Reference `./security-reference`.

