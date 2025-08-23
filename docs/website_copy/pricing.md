---
title: Pricing
description: Tiers, meters, FAQs, and self‑managed entitlements.
---

See `marketing/packaging-pricing` for full tiers and meters.

## Tiers (summary)

- Free: Starter caps for DUs, Runs, Connectors; community support
- Pro: Increased caps + SLA & chat support
- Business: Higher caps, SSO/SCIM, 99.9% SLA
- Enterprise: Dedicated tenancy/VPC, FIPS mode, 24/7

Overages/add‑ons: DUs per 1k, Runs per 1k, MAUs per unit, Connector Packs; Dedicated tenancy and FIPS as add‑ons. Details in `marketing/packaging-pricing`.

## Meters & definitions (for buyers)

- Decision Unit (DU): One authorization decision evaluated by the PDP after cache policy. Billable DUs are decisions evaluated by the PDP service. Caching reduces billable DUs.
- Workflow Run: One end‑to‑end execution of a workflow; retried nodes within a run are not new runs.
- Connector: A configured logical connection to an external system (Inventory/Automation). Pack pricing applies to groups of connectors.
- MAU: Monthly Active User authenticated via the IdP/BFF during the billing period.

## Self‑managed

- Annual licensing per Studio or Suite; equivalent caps to Pro with enterprise add‑ons available (HA/DR validation, hardened FIPS images, priority support).

## Pricing FAQ

- What is a Decision Unit (DU)? One PDP evaluation after cache policy.
- How are Workflow Runs billed? Per run; retries within a run are included.
- How are Connectors counted? Per configured connector; packs increase limits.
- Do you offer self‑managed licensing? Yes; annual per‑Studio or Suite with enterprise add‑ons.

Contact us for custom needs (dedicated tenancy, FIPS mode, private networking, SLAs).


