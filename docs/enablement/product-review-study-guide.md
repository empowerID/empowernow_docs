---
id: product-review-study-guide
title: Empower Now – Product Review Study Guide
description: Overview, components, quiz, essays, and glossary for the Empower Now Identity Fabric Suite.
tags: [enablement, audience-executive, roles-sales, roles-security]
---

## I. Overview of Empower Now

Empower Now is a vendor‑agnostic, open‑standards identity and access platform. It secures user experiences, secrets, and connectivity to cloud and on‑prem systems, emphasizing policy‑driven authorization (PDP), BFF‑mediated UX, and observability.

## II. Key Components and Features

### A. Empower Now Experience (User Interface)
- Purpose: Customizable end‑user interface replacing CRUD designer/runner.
- Key features:
  - Load tenant/customer pages, run workflows, view reports
  - Communicates strictly through the BFF; WCAG‑aware
  - Integrates with OpenID Auth/PDP for granular authorization
- Vibe Coding / Plugin Architecture:
  - Customers develop plugins (widgets/pages) and deploy via BFF file system
  - Plugins are authorized by the PDP before load/execute
  - Same‑origin model avoids library conflicts; supports fully custom UIs

See also: `services/experience/index`

#### Experience plugins: deployment specifics
- Source of truth (SoT): `ServiceConfigs`
  - Bundles: `ServiceConfigs/BFF/plugins/<pluginId>/<version>/index.esm.js`
  - Manifests/config: `ServiceConfigs/BFF/config/plugins.yaml`
- Register/update in `plugins.yaml` with:
  - `id`, `version`, `engine.experience`
  - `bundle.file: /app/plugins/<pluginId>/<version>/index.esm.js`
  - Contributions (routes/widgets) and permissions (allow‑lists, SSE)
- Hot reload: `POST /api/plugins/refresh` (no container rebuild)
- Governance controls:
  - Allow‑lists per plugin (method + path templates)
  - Quarantine/unquarantine endpoints for rapid rollback
  - Optional sha256 integrity check per bundle
- Controlled runtime: externals are constrained (e.g., `react`, `react-dom`, `@empowernow/ui`) to avoid dependency conflicts

See also: `services/experience/experience_plugins`, `services/experience/plugins-storage-deployment`, `services/experience/plugin_guide`

### B. Secrets Management
- Purpose: Centralize and secure secrets; move away from ENV files.
- Secret types:
  - Bootstrap secrets (pre‑startup; e.g., file mounts for Docker/K8s)
  - App‑managed credentials (runtime; e.g., OAuth tokens like Gmail access)
  - Platform secrets (platform connectors; e.g., Auth0, AD proxy)
- Vault integration (pluggable): OpenBao, HashiCorp Vault, Azure Key Vault; pointers reference secrets (e.g., `openbao+kv2://path/key`).
- Security & automation:
  - Vault Service acts as PEP, always calls PDP for authorization
  - Versioning and rollback; system definitions for create/read/delete/destroy/rotate/bulk/catalog
  - Metadata (creator/owner) for policy; business logs to Kafka for analytics/SIEM
  - mTLS for CRUD inbound APIs and BFF↔CRUD

See also: `services/crud-service/secrets/index`

#### Canonical URI pointers (secret references)
- Format: `provider[+engine]://<mount>/<path>#<key>[?version=N]`
- Examples:
  - `yaml://secret/app#token`
  - `openbao+kv2://secret/app/api#token`
  - `hashicorp+kv2://secret/app/api#token?version=3`
- Guards and policy:
  - Tenant/mount guard enforced at PEP
  - PEP always calls PDP with purpose (read/write/rotate/etc.)

See also: `services/crud-service/secrets/03-canonical-uris-and-policy`

### C. Empower Now Connect (Cloud Gateway)
- Purpose: Standards‑based connectivity between cloud services and on‑prem systems behind firewalls.
- Components:
  - Cloud Hub: Mesh component in containers; performs PDP authorization, DPoP, mTLS, JAR/PAR
  - Premise: Outbound encrypted WebSocket tunnels to proxy calls to on‑prem systems
- Principles: Vendor‑agnostic, open standards; uses PDP and Vault; aims for HA without cloud‑specific relays.

See also: `services/nowconnect/index`

### D. LDAP VDS (Virtual Directory Service)
- Purpose: LDAP server stack that virtualizes live systems and hot‑caches data as LDAP.
- Features:
  - Connects to systems supported by CRUD connectors (ODBC/REST)
  - Auto‑maps schema; can return a basic OU structure
  - Three‑layer caching (e.g., Redis back cache); never caches passwords
  - Supports strong, certificate‑based LDAP auth for government/military needs
  - Aggressive caching and object mapping; universal schema for diverse sources
  - Schema mapping and transformation via YAML definitions (map object classes/attributes)
  - System Definitions declare systems, object types, and commands for workflows/UIs

### E. Automation Studio (Implicit)
- Create system definitions to integrate data sources and commands; underpins workflows and data interactions.

## III. General Architectural Principles
- Microservices/modular; components work independently (use one or all)
- Open standards (OpenID/AuthZEN, FAPI, LDAP)
- Security‑first (PDP at UI/plugins, secrets, and connectivity; BFF; mTLS)
- Customization via Vibe Coding; secure plugin lifecycle
- Observability (Kafka logs, metrics/traces)

## IV. Competitive Landscape
Competes with Salesforce/ServiceNow/Teams via flexible, secure, cost‑effective design that avoids vendor‑locked services.

#### Trials and developer access
- Time‑boxed, self‑destructing Docker trials that run on customer hardware
- Enables individual developers and small teams to evaluate locally without hosted costs

---

## Quiz

1) What is the primary function of Empower Now Experience and how does Vibe Coding enhance customization?

Answer: End‑user interface for the suite; Vibe Coding enables custom plugins (widgets/pages) loaded via BFF and authorized by PDP for deep, safe customization.

2) What is the BFF’s role in Experience?

Answer: Secure intermediary for all UI communications, loads user plugins, and enforces PDP authorization ahead of data/actions.

3) Describe two secret types with examples.

Answer: Bootstrap secrets (pre‑startup via file mounts). App‑managed credentials (runtime OAuth tokens like Gmail access).

4) How is secret access secured with respect to the PDP?

Answer: Vault Service is the PEP, always calling the PDP before any vault action.

5) What problem does Empower Now Connect solve?

Answer: Secure, vendor‑agnostic cloud↔on‑prem connectivity without relying on proprietary relays.

6) Differentiate Cloud Hub vs Premise in NowConnect.

Answer: Cloud Hub runs in cloud containers performing authz and routing; Premise opens outbound encrypted tunnels and proxies to local systems.

7) What is the LDAP VDS and why might someone “hate it”?

Answer: An LDAP server stack/virtual directory that fronts diverse systems with LDAP; complex and heavy to build/operate despite being necessary for cert‑based LDAP.

8) How does LDAP VDS handle non‑LDAP data?

Answer: Uses CRUD connectors (ODBC/REST) and dynamic schema mapping to present data as LDAP with basic OU structure.

9) What is a key strategic goal for market reach?

Answer: Time‑boxed, self‑destructing Docker trials on customer hardware to democratize access.

10) Name two security features/protocols.

Answer: OpenID Auth/PDP authorization; mTLS between BFF and CRUD service (and inbound CRUD APIs). Also uses FAPI/DPoP as applicable.

---

## Essay Prompts

- Analyze how modularity and standards (plus Vibe Coding) position Empower Now versus Salesforce/ServiceNow. Include vendor/customer benefits and risks.
- Evaluate secrets management (types, pluggable vault, PDP) and how it addresses common credential risks.
- Compare NowConnect to traditional relays (e.g., Azure Relay) on architecture, security (PDP, mTLS), and multi‑cloud/hybrid implications.
- Discuss LDAP VDS’s role, bridging disparate data via LDAP with caching, key use cases, and security considerations (e.g., cert‑auth for public sector).
- Describe the Identity Fabric vision and how Experience, Secrets, Connect, and LDAP VDS unify into a secure, extensible platform.

---

## Glossary (selected)

- Empower Now Experience: Customizable end‑user interface for the Identity Fabric.
- Vibe Coding: Architecture that allows customer‑authored plugins (widgets/pages) with PDP gating.
- Plugins: UI components integrated into Experience via BFF under policy.
- BFF: Backend for Frontend; secure gateway/session terminator for the SPA.
- Empower Now Identity Fabric Suite: Vendor‑agnostic IAM platform using open standards.
- Empower Now Connect: Cloud gateway for secure cloud↔on‑prem connectivity.
- Cloud Hub: Cloud mesh component doing PDP checks and routing.
- Premise: On‑prem agent establishing outbound encrypted tunnels.
- Secrets Management: Centralized system for secure secret storage and usage.
- Bootstrap Secret: Needed before app start (e.g., mounted files in containers).
- App Managed Credential: Runtime credential (e.g., OAuth token) managed by the app.
- Platform Secret: Credential for platform services (e.g., Auth0 connector, AD proxy).
- Vault Service: Abstraction over vaults; acts as PEP and enforces policy.
- OpenBao / HashiCorp Vault / Azure Key Vault: Supported vault providers.
- PDP: Policy Decision Point, evaluates and returns authorization decisions.
- PEP: Policy Enforcement Point, enforces PDP decisions.
- WCAG: Accessibility standard targeted by Experience UX.
- OpenID Auth: Authorization framework used across the platform.
- mTLS: Mutual TLS for strong, certificate‑based service auth.
- CRUD Service: Workflow/CRUD execution backend.
- LDAP VDS: Virtual Directory Service that presents diverse data sources as LDAP.
- System Definition: Automation Studio configuration for systems/commands.
- Kafka / ClickHouse: Eventing and analytics backbone.
- SIEM: Security analytics integrations via Kafka.
- DPoP / FAPI: Standards for sender‑constrained tokens and secure APIs.
- YAML: Declarative configs used across the platform.


