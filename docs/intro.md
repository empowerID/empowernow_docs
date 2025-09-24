---
sidebar_position: 1
---

# EmpowerNow Documentation

Welcome to the EmpowerNow documentation hub. This site provides product, platform, and operations documentation and training for the following personas:

- End Users
- Admins
- Developers
- DevOps Engineers
- Security Officers & Auditors

Use the sidebar to explore content by product and role.

## What it is (at a glance)

One Identity & Authorization Fabric that enforces the same policy for APIs, apps, and AI agents. Core building blocks:

- ARIA Shield (gateway): one secure front door; allow/deny with reasons; budget checks; SIEM logs; no browser tokens
- Authorization (PDP): OpenID AuthZEN; obligations & budgets; break‑glass/kill switches
- Authentication (IdP): short‑lived, scoped tokens; works with Okta & Microsoft Entra ID
- Automation Studio: no‑code connectors as MCP Tools; per‑run policy; approvals, budgets, receipts; secrets via CyberArk/Vault
- Inventory: no‑code inventory connectors; continuous discovery; feeds SailPoint/EmpowerID

## Why it matters

- Real‑time authorization on every API/tool/model call
- Budgets and limits to control AI spend; audited receipts
- Config‑as‑code; cloud or self‑hosted; data stays in your tenant

## Use cases

- Govern human and AI agent usage with real‑time authorization and spend limits
- Standards‑based real‑time authorization (OpenID AuthZEN) for apps and AI processes
- No‑code connectors and graph workflows as MCP tools for agents and humans
- Zero‑trust API front door for SPAs/mobile: one origin, consistent enforcement and logs

## Coexistence

Keep Okta/Microsoft Entra (sign‑in), SailPoint/EmpowerID (IGA), CyberArk/HashiCorp Vault (secrets). EmpowerNow adds unified authorization and an agent‑aware gateway with budgets and receipts.

## Open standards

OpenID AuthZEN + governed OAuth; OIDC/SCIM/CAEP supported.

## Quickstart

- ARIA Shield + ARIA MCP Gateway: start here → [/docs/services/aria-shield/](./services/aria-shield/index.md)
- Authentication (IdP): configure sign‑in → [/docs/services/idp/](./services/idp/index.md)
- Authorization (PDP): enforce policy → [/docs/services/pdp/](./services/pdp/index.md)

## Download

- One‑page overview (print‑friendly): [/docs/resources/it-sa-handout-onepage](./resources/it-sa-handout-onepage.md)

## EmpowerNow stack (apps and services)

- IdP (Identity Provider) and IdP UI (Authentication Studio)
- PDP (Policy Decision Point) and PDP UI (Authorization Studio)
- ARIA Shield for SPA APIs, provider streaming, and budgets
- CRUD Service (workflow engine and service layer)
- Visual Designer (Automation Studio) – frontend for CRUD Service
- Analytics service (Kafka → ClickHouse → API layer for SPAs)
- Membership Service (Neo4j PIP)
- Naming Service (IGA naming and uniqueness)
- Data Collector (connector framework / IGA inventory)
- Client SDKs (`@empowernow/ui`, auth SDKs, Python libraries)

If you're not sure where to start, choose your persona below.

## Quick starts by persona

- End Users: Overview of EmpowerNow apps, onboarding, and how-tos
- Admins: Tenant setup, user management, configuration, compliance
- Developers: SDKs, APIs, local development, extension points
- DevOps Engineers: CI/CD, environments, observability, scaling
- Security Officers & Auditors: Security model, controls, evidence and reports

If you want to propose changes to docs, open a pull request in `empowernow_docs`.
