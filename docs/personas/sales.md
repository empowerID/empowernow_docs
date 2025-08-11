---
id: sales
title: Sales — BFF + PDP + IdP Battlecard
sidebar_label: Sales
tags: [persona:sales, audience:field, service:bff]
---

Use this page in discovery and early shaping calls. It positions our BFF together with our PDP and IdP against common alternatives (Curity, Okta/Auth0, Ping, and “gateway‑only” approaches).

## Elevator pitch (business)

The BFF is the secure front door for SPAs: one origin for the browser, server‑side OAuth, centralized authorization (PDP), and pragmatic routing to new and legacy services. Paired with our IdP and PDP, it reduces risk, speeds delivery, and standardizes user access across apps.

## When to lead with it

- Multiple SPAs hitting many APIs, inconsistent auth, or CORS pain
- Compliance pressure (no tokens in the browser, CSRF, auditability)
- Legacy services that must remain while new UIs ship
- Need for centrally governed permissions across teams/services

## What prospects do today (and gaps)

- SPA libraries from IdPs (Okta/Auth0/Ping/Curity) doing OAuth in the browser → tokens in JS, per‑service CORS, fragmented authZ
- API gateway only (Kong/Apigee/Traefik) → great L7 features but no app‑aware sessions/CSRF or per‑user composition
- Bespoke per‑service proxies → duplicated logic and policy drift

## Our differentiation

- Server‑side OAuth boundary: tokens never reach the browser; HttpOnly session + CSRF
- Embedded PDP: path/method → resource/action mapping with decision caching
- Same‑origin developer experience: call `/api/**`; consistent headers/errors/observability
- First‑class EmpowerID: workflows/WebUI catalog with client‑credentials handled server‑side
- Legacy bridge: resilience (circuit breaker/cache/limits) for C# services while modernizing

## Competitive context (positioning)

| Topic | Our BFF + PDP + IdP | Curity/Okta/Auth0/Ping (IdP SDK in SPA) | Gateway‑only (no BFF) |
| --- | --- | --- | --- |
| Browser tokens | None (HttpOnly cookie) | Yes (JS manages tokens) | Varies; often yes |
| CSRF/session | Built‑in, standardized | App‑by‑app | Not provided |
| Authorization | PDP per endpoint | App‑by‑app; often scope‑based | Policy at L7 only |
| Dev UX | Same‑origin `/api/**` | CORS per API | CORS/routing per API |
| Legacy coverage | Proxy w/ CB + cache | N/A | Possible, but no sessions/PDP |
| Time to value | Quick: config + a few routes | App integration per SPA | Infra‑heavy + app work |

Notes

- We integrate with any IdP (including Okta/Auth0/Ping/Curity). The BFF replaces SPA‑token flows with a safer session model and adds PDP‑based authorization.

## Discovery questions

- Which SPAs and APIs are in scope? How many origins and CORS exceptions exist today?
- Where do tokens live now? Any past incidents or audit findings?
- How are permissions decided per endpoint? Is there a central policy (PDP)?
- What legacy services must remain? Uploads/streaming needs? Rate limits?

## Objection handling

- “Our IdP SDK works already.”
  - Keep IdP; we move tokens server‑side, add CSRF/session, and centralize authZ via PDP.
- “We have a gateway.”
  - Great for TLS/rate limits. The BFF adds application‑aware sessions, CSRF, PDP, composition, and legacy resiliency.
- “GraphQL solves aggregation.”
  - Still needs sessions/CSRF/PDP; the BFF can front GraphQL too.

## Proof points / next step

- Golden Path demo: login → call `/api/**` with cookie + CSRF
- Show PDP deny→allow via `pdp.yaml:endpoint_map`
- Call an EmpowerID workflow via `/api/v1/empowerid/workflow`

## Packaging (suggested)

- Starter: BFF + IdP; PDP optional
- Enterprise: BFF + IdP + PDP with predefined mappings and EmpowerID catalog

For visuals to present, open: `Services / BFF / Explanations / BFF — Executive Overview` or `Visual Guide`.


