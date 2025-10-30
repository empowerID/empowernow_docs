## Briefing: The ARIA Initiative for AI Governance and Security

### Executive Summary

The ARIA (Agent Risk and Identity Authorization) initiative introduces a comprehensive framework of "Identity Fabric" services designed to provide provable guardrails for AI agents and Large Language Model (LLM) usage. The core value proposition is to cap spending, prevent data leaks, and ensure audit-readiness without impeding development velocity. By moving authorization to the point of action and making every decision provable through signed, hash-chained receipts, the system shifts from reactive logging to proactive, real-time enforcement.

This addresses critical failure modes associated with AI agents, including runaway token spend, data exfiltration through prompts, and tools breaking due to schema changes. The architecture separates the decision plane (a central Policy Decision Point, or PDP) from the enforcement plane (lightweight Policy Enforcement Points, or PEPs, such as the ARIA Gateway and a Backend-for-Front-End proxy). This model provides centralized policy control with low-latency, localized enforcement, delivering predictable costs, reduced security incidents, and a tamper-evident audit trail aligned with SOC2, ISO, and NIST expectations.

Key Business and Risk Reduction Outcomes:

* Spend Control: A dual-enforcement model where the PDP pre-gates requests against live budget data and PEPs settle costs based on actual usage effectively eliminates AI spend leakage and overruns.
* Provable Compliance: All governed actions generate signed, hash-chained receipts, creating a tamper-evident ground truth that materially reduces audit preparation time.
* Incident Reduction: Proactive controls like schema pinning prevent breaking changes from being deployed, while egress allowlists cut off data exfiltration paths.
* Safer Velocity: Centralized policy management allows product teams to iterate quickly within established safety guardrails, supporting controlled rollouts and faster recovery from policy-related issues.


--------------------------------------------------------------------------------


1. The Challenge: Uncontrolled AI Agent Risk

The rapid adoption of AI agents has introduced significant new risks for organizations. While accelerating development, these agents create new failure modes that traditional security and governance models are ill-equipped to handle.

* Runaway Spending: AI spending can "get out of hand really, really quickly," becoming a major concern without robust controls. The lack of visibility and auditability leads directly to a lack of spending control.
* Data Exfiltration and Hacking: AI hacking is a growing concern. Malicious actors can use indirect methods, such as embedding instructions in a Jira ticket that an AI reads, to exfiltrate sensitive data like GitHub repository code.
* Tool Instability: Agents relying on external tools can break at runtime if the tool's schema changes unexpectedly, leading to operational instability.
* Lack of Provable Evidence: When incidents occur, traditional logs often fail to provide a definitive, tamper-evident record of what was decided, by which policy, and what action was taken. This makes audits and incident response reliant on "guesses—not facts."

The core principle of the ARIA initiative is that "if you have no visibility, you have no security," and if you cannot get in the middle of conversations between agents and providers, "you can't do anything about it. You can't record it, you can't log it, you can't audit it, you can't authorize it."

2. Core Architecture: The Empower Now Identity Fabric

Empower Now is conceptualized as a set of "identity fabric services." This is not a marketing term for having APIs; rather, it signifies an architecture where each identity function (e.g., authentication, authorization) is an independent service that exposes its functionality via APIs adhering to open standards. The goal is interoperability, allowing customers or other vendors to "plug holes" where existing solutions are lacking, without requiring a full rip-and-replace of their identity infrastructure.

2.1. Architectural Principles

* Separation of Decision and Enforcement: The architecture fundamentally separates the control plane from the data plane. A central Policy Decision Point (PDP) makes authorization decisions once, while lightweight Policy Enforcement Points (PEPs) apply those decisions in real-time at the edge.
* Policy Enforcement Points (PEPs):
  * Aria Shield (BFF): Acts as the PEP for all LLM traffic.
  * MCP Gateway: Acts as the PEP for all AI agent tool usage.
  * IDP: Acts as a PEP for pre-issuance obligations like consent.
* Receipts as Ground Truth: Every significant action and decision produces a signed, hash-chained JWS receipt. This creates a tamper-evident audit trail that serves as the definitive record, making operations "audit-ready."
* Standards-Based Interoperability: The entire fabric is built on open standards like OAuth, OpenID Connect, JWT/JWKS, and Rich Authorization Requests (RAR) to avoid vendor lock-in.

2.2. Component Services Breakdown

The platform is composed of several key microservices that work in concert:

Service	Description
Empower Now IDP	An OAuth and OpenID Connect-based Identity Provider designed specifically for modern AI security needs. It implements numerous standards (RAR, PAR, JAR, JARM, FAPI, OBO) and supports WebAuthn/FIDO passwordless authentication. It is not intended to replace workforce SAML authentication.
PDP	The centralized "brain" for authorization. As a hot market item, externalizing authorization to a PDP is seen as the only viable way to manage AI agents. This component is OpenID Authz-compliant and is the source for all authorization decisions, constraints, and obligations.
Aria Shield (BFF)	A "Backend for Front End" proxy that serves as a "Super PEP." It intercepts all traffic from front-end applications and AI agents to back-end services and LLM providers. This model eliminates tokens from the browser, using secure, server-managed sessions (via Redis) and HTTP-only cookies, a pattern that decisively addresses browser token hackability. It is the key to enforcing policies on LLM traffic.
MCP Gateway	A proxy that sits between AI agents and MCP (Machine-Readable Capability Protocol) servers/tools. It re-exposes tools to agents, performing authentication and authorization. It solves the "too many tools problem" where AIs are typically limited to 50-60 tools before performance degrades.
Membership Service	A meta-directory built on a Neo4j graph database. It stores objects, identities, relationships, tools, and delegation concepts, serving as a Policy Information Point (PIP) for the PDP to understand complex relationships like "who can do what for whom."
Orchestration Service	Provides no-code connectors and graph-based workflows. It can expose any connector command (e.g., "get a user from Azure") or entire workflow as an MCP tool for AI agents to consume via the MCP Gateway.
Analytics Service	The central consumer for business-level logging. Services log events to Kafka, and the Analytics service processes these logs, transforms them, and stores them in final destinations like ClickHouse (for high-speed reporting) and PostgreSQL PG Vector (for AI analysis). It is the source for real-time budget state.
Receipt Vault	A dedicated service that signs and hashes high-value logs and decisions, creating tamper-evident receipts. This ensures that records, such as spending logs, cannot be altered without detection.
VDS	A Virtual Directory Service that combines LDAP and SCIM virtualization. It leverages CRUD service connectors to expose any connected system via LDAP or SCIM protocols, performing live schema transformations.
Connect	A replacement for the Cloud Gateway, designed for secure cloud-to-on-prem communication. It is vendor-agnostic and could be used by other platforms like SailPoint or Saviynt.

3. Key Security and Governance Features

The ARIA framework provides a multi-layered defense and governance strategy that maps specific controls to known threats.

3.1. Threats-to-Controls Mapping

Threat/Risk	Control	Where Enforced
Tool Schema Drift	Schema Pins (version/hash, with a 4h previous version window for rollouts)	IdP (aggregates pin), ARIA Gateway (verifies)
AI Overspend	PDP-led Budgets (pre-gate request) + PEP Hold/Settle (enforce on usage)	PDP, Aria Shield (BFF)
Prompt Leakage / Unsafe Output	Real-time AI classification, content enforcement policies, and stream-time truncation	Aria Shield (BFF), PDP
Identity Replay / Token Theft	Pairwise sub and act.sub claims, with optional DPoP binding	IdP (mints token), PEPs (verify binding)
Unapproved Data Egress	Egress allowlists and redirect re-checks in policy constraints	ARIA Gateway, Aria Shield (BFF)
Missing Audit Trail	Signed, hash-chained receipts for every action and decision	ARIA/BFF (emit), Receipt Vault (sign), Analytics (verify)

3.2. Advanced Policy Enforcement: Constraints and Obligations

A key innovation is the extension of the PDP's role beyond a simple allow/deny decision. By leveraging the OpenID Authz context, the PDP communicates rich enforcement rules back to the PEPs.

* Constraints: These are rules that are synchronously enforced by the PEP before the action proceeds. They act as precise, real-time limits on an approved action. Examples include:
  * Budgetary Limits: constraints.spend_budget defines daily, monthly, or provider-specific spending caps.
  * Egress Control: constraints.egress_allow provides a whitelist of permissible outbound destinations.
  * Model Control: constraints.models_allow specifies which LLM models can be used. The system can also perform dynamic model routing, transparently switching a request to a cheaper model based on policy.
  * Data Scopes: constraints.data_scope can inject server-side filters (e.g., row_filter_sql) to limit the data an agent can access.
* Obligations: These are tasks that the PEP is expected to perform asynchronously after an action is permitted. They do not block the request but ensure follow-up processes are triggered.
  * Auditing: An audit_log obligation can instruct the PEP to log specific event details to Kafka.
  * Workflow Triggering: A run_workflow obligation can instruct the PEP to execute a Orchestration Service workflow, enabling actions like sending a manager an email or opening a Jira ticket.
  * Consent: When a policy requires user approval for a high-risk action (e.g., booking an expensive flight), the PDP returns a consent obligation to the IdP, which then initiates a user consent flow before issuing the final token.

4. Core Contracts and System Flows

The system operates on a set of standardized, cryptographically-secured contracts that carry context between components.

4.1. Core Contracts

Contract	Description	Key Fields & Purpose
ARIA Passport	A JWT access token issued by the IdP that binds an agent to a user for a specific task.	sub: Pairwise user ID (privacy-preserving).<br>act.sub: Agent principal bound to the user.<br>aud: Audience (e.g., aria.gateway), prevents token replay.<br>aria.schema_pins: Tool schema version/hash to prevent drift.<br>aria.plan_contract_jws: Optional signed plan of steps.<br>aria.budget: Declares the spend envelope.
Plan Contract	A signed JWS payload that defines a multi-step agent workflow, enforcing order and parameters.	index: Current step in the plan.<br>tool: The specific tool to be called.<br>params_fingerprint: A hash of the parameters to prevent drift.<br>max_cost: Per-step cost cap.
Receipt	A signed JWS payload that serves as the tamper-evident fact of what was decided and executed.	policy_snapshot: Constraints in effect at the time of action.<br>params_hash: Hash of the request parameters (no raw data).<br>prev_hash: A link to the previous receipt for that agent, creating a hash chain.<br>usage: Final token/cost usage for budget reconciliation.

4.2. End-to-End Flow: Agent Invoking a Tool

1. Request Ingress: An agent sends a request with an ARIA Passport to the ARIA Gateway. The gateway validates the token's signature, audience, and the pairwise binding between the user (sub) and agent (act.sub).
2. Schema Pin Verification: The gateway calls the Tool Registry to verify that the tool's schema hash in the passport matches the registered version (or a recent previous version within a 4-hour rollout window).
3. Plan Validation (Optional): If a Plan Contract is present, the gateway validates the current step's index, tool, and parameter fingerprint.
4. PDP Decision: The gateway calls the PDP, sending the agent/user identity, action, and resource. The PDP evaluates policies, checks budgets against live data from Analytics, and returns a decision with applicable Constraints and Obligations.
5. PEP Enforcement: The gateway enforces the returned constraints, such as checking the egress host against the allowlist and shaping parameters.
6. Tool Egress: The request is forwarded to the final tool.
7. Receipt Emission: The gateway constructs a receipt payload (including the policy snapshot and parameter hash), gets the previous receipt's hash to maintain the chain, has it signed by the Receipt Vault, and stores the new chain head.
8. Analytics Ingestion (Async): The Analytics service consumes the receipt, verifies its signature, checks chain continuity, updates budget counters, and derives spend metrics.

5. Status and Roadmap

The core components of the ARIA v1 platform have been shipped, with advanced features guarded by flags for phased rollout.

* Shipped: IdP token exchange for passports/pins, ARIA Gateway PEP, BFF stream-time enforcement, PDP with constraints/obligations, and the receipt-centric Analytics and budgeting engine.
* Deferred/Flagged: Advanced features like default Proof-of-Possession (DPoP), SPIFFE/mTLS to tools, transaction tokens, signed registry attestations, and deny receipts are on the roadmap.

The phased rollout plan prioritizes establishing the core framework, enabling PDP-led budgets, turning on consent for high-risk tools, and then adding identity chaining for specific use cases. Key Performance Indicators (KPIs) and Service Level Objectives (SLOs) are in place to monitor policy deny accuracy, spend variance, receipt signing latency, and chain continuity.
