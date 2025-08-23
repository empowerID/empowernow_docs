# ARIA — Agent Risk & Identity Authorization

## No-Code Product Overview for Product Management

---

## 1) Elevator Pitch (What we’re building)

**ARIA** is an **agent security and authorization platform** that sits between AI agents and enterprise tools/APIs. It gives enterprises **provable control** over what agents can do, for whom, with which tools, under which limits—**without changing existing identity or API standards.**
Think: **an MCP-aware policy enforcement point (PEP)** that adds cryptographic guardrails, verifiable authorization, and tamper-evident audit trails to every agent action.

---

## 2) Why the market needs this (Why now)

* **AI agents act at machine speed** and can chain tools in novel ways; legacy, static permissions and manual approvals don’t scale.
* **Per-user isolation is hard** when one agent serves many users; typical service accounts leak context across users.
* **Compliance and audit** require evidence you can prove, not logs you can argue about.
* **Procurement & risk teams** are blocking agent projects until there’s a credible control plane with standards alignment (OAuth/OIDC/AuthZEN).

---

## 3) The problems ARIA solves

1. **Cross-user data leakage** when agents share broad service accounts.
2. **Unbounded or off-script actions** (e.g., unexpected costs, unintended side effects).
3. **Tool/API drift** (schema changes) breaking or altering behavior without visibility.
4. **Prompt/context tampering** that changes what an agent thinks it should do.
5. **Weak, non-provable audits** scattered across systems and easy to dispute.
6. **Lack of runtime anomaly detection** specific to agent behavior.
7. **Hard-to-operate controls** that aren’t compatible with existing IdP/PDP stacks.

---

## 4) What ARIA is (Overview, no code)

* A **standards-first security layer** for AI agents:

  * **Authorization:** OpenID **AuthZEN draft-04** for PDP calls (strict boolean decisions).
  * **Identity & delegation:** OAuth 2.0 Token Exchange (RFC 8693), Rich Authorization Requests (RFC 9396), OpenID Connect.
* A **gateway/PEP** that verifies identity binding, capabilities, plans, context, and tool attestations **before** any tool call is allowed.
* A **control & audit plane** that produces **tamper-evident receipts** for every authorized action.
* Works **alongside** your existing IdP, PDP, API gateways, and tools—no protocol changes required.

---

## 5) Core capabilities (What ARIA does)

**Seven controls, in plain language:**

1. **User-Bound Agent Identities**
   Each agent instance is cryptographically bound to one user; prevents cross-user access.

2. **Tool Schema Attestation**
   Every tool call is checked against a signed schema version/hash; drift or unapproved versions are blocked.

3. **Privacy-Preserving Capability Proofs**
   Agents prove they hold the specific permission needed **without revealing** everything they can do; keeps tokens compact and private.

4. **Plan Contracts (Bounded Execution)**
   Pre-approved steps, parameter fingerprints, and budgets; off-script actions or cost overruns are blocked automatically.

5. **Context-Root Binding**
   A tamper-evident fingerprint of the trusted context (prompts, constraints, prior outputs) tied to the request; detects manipulation.

6. **Behavioral DNA (BDNA) Monitoring**
   Baselines agent behavior (tool sequences/timing/error patterns) and flags drift that suggests compromise or misuse.

7. **Receipt Chains (Immutable Audit)**
   Every decision/action emits a signed, hash-chained receipt; creates a clean, defensible audit trail.

---

## 6) How it works (at a glance, no code)

* **Agents** call tools as usual.
* **ARIA Gateway** intercepts each call, verifies identity binding, tool attestation, capability proof, plan step, and context integrity, then asks the **PDP** (AuthZEN) for a **boolean** allow/deny.
* On **allow**, ARIA forwards to the tool and emits a **receipt**; on **deny**, it emits a **deny receipt** with cause.
* **IdP** issues delegation tokens (with ARIA extensions) using existing OAuth/OIDC; **Membership/Graph** stores user↔agent↔tool relationships.

---

## 7) Who buys it (Personas & buyers)

* **Economic buyer:** CISO or CTO (security & platform risk ownership).
* **Champions:** Head of Platform/AI, Security Architecture, IAM Lead, VP Eng.
* **Influencers:** Compliance/Risk, Data Protection Officer, Finance Ops (budget control), Line-of-Business owners piloting agents.

---

## 8) Primary use cases (What they’ll use it for)

* **Customer Support Agents** accessing CRM, billing, and case tools with strict per-customer isolation.
* **Finance/Procurement Agents** placing orders, issuing refunds, paying invoices with per-action budgets and audit receipts.
* **IT/DevOps Agents** performing controlled changes (e.g., limited S3 writes, ticket updates) with plan contracts.
* **Sales/Field Agents** that aggregate customer data and take scoped actions under strict capabilities.
* **Back-office Automation** (RPA modernization) where every step must be bounded and auditable.

(Verticals: financial services, healthcare, SaaS, e-commerce, manufacturing—anywhere agents touch regulated or sensitive data.)

---

## 9) Product value (Why ARIA, outcomes to expect)

* **Provable security boundaries**: Isolation and allow/deny decisions you can demonstrate, not just assert.
* **Operational confidence**: Tools can update safely; ARIA detects drift before it bites.
* **Predictable spend**: Plans/budgets cap exposure per action/flow.
* **Faster approvals**: Compliance gets tamper-evident receipts by default, reducing audit friction.
* **Standards fit**: Drops into existing IdP/PDP/tooling; no proprietary protocol lock-in.

**Example KPIs to track (no inflated numbers):**
time-to-approve agent use cases, % of prevented cross-user attempts, PDP decision latency, # of plan violations blocked, audit preparation time, mean time to detect anomalous behavior.

---

## 10) How others try to solve this (Competitive/alternative approaches)

**A. Traditional API Gateways / WAFs**

* *Strengths:* mature routing, rate limiting, headers, some auth integrations.
* *Gaps:* assume static app behavior; lack user-bound agents, plan contracts, context binding, or cryptographic receipts.

**B. Standard IAM / IdPs / PAM**

* *Strengths:* strong human/service identity, SSO/MFA, role management.
* *Gaps:* not built for per-call, multi-step agent toolchains, capability proofs, or schema attestation at runtime.

**C. Policy Engines (e.g., generic ABAC/RBAC, OPA-style)**

* *Strengths:* flexible policies, decoupled decisions.
* *Gaps:* need an **agent-aware PEP** to enforce plan steps, context roots, attestations, budgets, and to emit tamper-evident receipts.

**D. SIEM / Audit Log Aggregation**

* *Strengths:* central visibility after the fact.
* *Gaps:* logs are disputable, can be incomplete, and aren’t a control surface; no per-call cryptographic provenance.

**E. Vendor-specific “agent guardrails”**

* *Strengths:* convenient within a single stack.
* *Gaps:* siloed, limited across heterogeneous tools; rarely standards-aligned on wire; weak enterprise audit posture.

---

## 11) Why ARIA is uniquely valuable (Our differentiation)

* **Agent-first controls** designed for tool-chaining and machine-speed decisions.
* **Cryptographic enforcement** (binding, attestations, proofs, receipts) rather than best-effort configs.
* **End-to-end bounded execution** via **plan contracts**—not just “allow tool X.”
* **Context integrity** (context-root binding) to counter manipulation that traditional auth can’t see.
* **Standard wire protocols** (AuthZEN draft-04, OAuth/OIDC) so it fits cleanly into existing stacks.
* **Audit-complete by design**: Receipts are produced on every decision, ready for compliance without extra projects.

---

## 12) What’s in scope (Features by milestone, no code)

### MVP (Phase 1)

* **MCP-aware PEP (Gateway)** enforcing: user-binding, tool attestation, sequential plan contracts, capability proofs, and receipt chains.
* **Strict AuthZEN PDP integration** (boolean only).
* **IdP delegation tokens** with ARIA extensions (by-reference attestations).
* **Membership/Graph** for user↔agent↔tool relationships and consent.
* **Dashboards**: decisions, denials, attestation mismatches, plan violations.

### Phase 2 (Adoption at scale)

* **BDNA monitoring in shadow mode** → configurable enforcement.
* **Plan DAGs & parallel steps** (when needed by real flows).
* **Receipt explorer** (search, export, anchoring options).
* **Tenant-aware policy packs** (time windows, value limits, tool classes).

### Phase 3 (Enterprise hardening)

* **Key rotation runbooks**, high-availability SLAs, disaster recovery.
* **Deeper ecosystem adapters** (popular CRMs, ERPs, billing).
* **Controls catalog** (prebuilt policies for common use cases).

---

## 13) What we’ll need from customers (Adoption prerequisites)

* Existing **IdP** (OIDC/OAuth2) and a **PDP** or willingness to run a compatible one.
* Tool owners to publish **schema attestations** (version + hash) to a registry.
* Agreement on **canonical tool IDs** and **capability naming**.
* A small set of **pilot use cases** to define plans/budgets and validate audit outputs.

---

## 14) Risks & mitigations

* **Integration friction:** mitigate with standards, adapters, and a guided pilot.
* **Policy complexity:** provide reference policies and “good defaults.”
* **Performance sensitivity:** parallelize checks and cache attestations; enforce strict SLAs.
* **Change management:** receipts and dashboards to build trust with security/compliance early.

---

## 15) Crisp positioning (external-facing summary)

* **Category:** Agent Security & Authorization Platform (MCP-aware PEP).
* **Tagline:** *Provable authorization and audit for AI agents.*
* **Value pillars:** Secure-by-default, Verifiable compliance, Predictable cost, Standards-aligned.

---

### TL;DR for PMs

ARIA gives enterprises the missing **control plane** for AI agents: **who** an agent is acting for, **what** it’s allowed to do, **how** it must do it, **how much** it can spend/change, and **evidence** for every decision—**all using the standards they already run.**
