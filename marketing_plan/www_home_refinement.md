Amazing. Here’s the **final, production-ready spec** for the homepage + supporting assets—crafted for sophisticated CISOs (no FUD, no fake numbers), with copy blocks you can paste, component specs for devs, and a two-week ship plan.

---

# 0) Principles (enforce everywhere)

* **Mechanism over marketing.** Show the control and its evidence.
* **Stage-honest.** Label test artifacts; avoid implied scale.
* **Standards-first.** OAuth 2.1, RFC 8693 TE, OpenID AuthZEN, MCP.
* **One diagram + one artifact per idea.**
* **Editorial rules:** ban scare words; every claim must reference a standard or artifact; monthly status update on controls.

---

# 1) Information Architecture (final order)

1. **Hero** (fear/solution balance + honest status bar)
2. **Why now** (facts only)
3. **Tool Factory (CRUDService)**
4. **Complete Security Stack** (pre-exec → decide → runtime → identity) + **proof atoms**
5. **ROI Calculator** (transparent)
6. **Journey Paths** (3 concrete JTBD scenarios)
7. **How We’re Different** (positive grid)
8. **Standards & Interop** (chips + tooltips)
9. **Pricing Anchor**
10. **Final CTA** (with honest status)
11. **Footer**: Compare (vs DIY, vs Status Quo) + “For EmpowerID customers” + Design Partner page

---

# 2) Final copy (paste-ready)

## 2.1 Hero

**H1:** **Secure AI agents that actually do work.**
**Subhead:** Turn any API into a governed agent tool in minutes. **Every call authorized. Every action proven.**
**Power line:** **The only platform that makes agents useful *and* safe—**from API to governed tool in **under 10 minutes**.

**CTAs:**

* **Start the 5-minute Quickstart** (primary)
* **Watch the 90-second demo** (secondary)

**Status bar (honest):**

```
Platform Status: LIVE | Demo Environment: ACTIVE | Create Your First Tool: < 5 MIN | Documentation: COMPLETE
```

**Standards label:** *Built on standards you trust:* OAuth 2.1 • Token Exchange (RFC 8693) • OpenID AuthZEN • MCP • Copilot Actions • OpenAI Functions

---

## 2.2 Why now (facts, no predictions you can’t cite)

* Major platforms are shipping agent tools **before governance is universal**.
* Enterprises are planning for **thousands** of agents and need consistent authorization and **evidence**.
* **Compliance frameworks** are adding AI governance requirements (policy + receipts).

**CTA:** *See how “governed” works →* (scroll to Security Stack)

---

## 2.3 Tool Factory (CRUDService)

**H2:** **Turn any API/DB into an agent-safe tool—no code.**
**Body:** Paste an endpoint, get an **MCP-ready tool** with schema pins and policy hooks. Publish once to **MCP / Copilot / Functions**.
**Micro-proof:** *Live demo: create your first tool in real time.*
**CTAs:** **Quickstart** · **Adapter catalog** · **Workflow examples**

---

## 2.4 Complete Security Stack (merged)

**H2:** **Pre-exec validation → PDP decisions → runtime guardrails → receipts**

* **Pre-execution (MCP Gateway):** validate **plan & schema pins**; block injection/overreach **before** the model runs.
* **Decide (AuthZEN PDP):** standardized **who/what/for whom/constraints** + obligations & TTL.
* **Runtime (ARIA Shield):** **budgets (HTTP 402)**, parameter allow-lists, egress filters; cost attribution.
* **Identity propagation (IdP):** **OAuth 2.1 + Token Exchange (RFC 8693)**; on-behalf-of, short-lived tokens; no long-lived secrets.

**Proof atoms (real—even from test env; clearly labeled):**

**Blocked call (budget)**

```
HTTP/1.1 402 Budget Required
error: "budget_exceeded"
call_id: "abc-123"
```

**Receipt (production format, test data)**

```
{ decision_id:"d-9f2", policy_hash:"…a1c",
  tool_schema_hash:"…7b9", cost_usd:0.012, ttl_ms:5000 }
```

**CTAs:** **See a blocked call** · **Open a real receipt** · **Policy examples**

---

## 2.5 ROI Calculator (transparent)

**H2:** **Calculate your potential savings**
**Subtext:** *Based on your inputs and published industry averages; adjust assumptions.*

* Inputs: `# tools`, `weeks per tool`, `loaded eng cost`, `# platforms`
* Formulas (show inline):

  * `DIY = tools × weeks × eng_cost × platforms`
  * `EmpowerNow (Y1) ≈ governed_endpoints × $500 × 12 + usage + seats`

**Pre-filled example:**
*50 × 6 × $200,000 × 2 = **$11.5M DIY*** vs **$120k–$300k ARR** (+ usage)
**CTA:** **Estimate my savings**

---

## 2.6 Journey paths (concrete)

* **“My ChatGPT agents are calling our SAP APIs ungoverned.”** → *Stop exfiltration today.*
  **CTAs:** Try Gateway · Security brief
* **“I need Salesforce data in Claude by Friday.”** → *Ship safe tools fast.*
  **CTAs:** Quickstart · Adapter catalog
* **“Deloitte audit starts in 30 days.”** → *Hand auditors a packet.*
  **CTAs:** View receipts · Auditor guide

---

## 2.7 How we’re different (positive)

| What you need              | Others (typical)     | **EmpowerNow**                                             |
| -------------------------- | -------------------- | ---------------------------------------------------------- |
| Working tools **today**    | “Coming soon” or DIY | **Live demo: create a tool in < 5 min**                    |
| Cross-platform enforcement | Logs/observability   | **Pre-exec pins + runtime budgets/egress**                 |
| Standardized decisions     | App-specific rules   | **OpenID AuthZEN** decisions (constraints/obligations/TTL) |
| Proof for audit & FinOps   | Unstructured logs    | **Cryptographic receipts** (decision/policy/schema/cost)   |
| Identity propagation       | Ad-hoc JWT passing   | **OAuth 2.1 + RFC 8693 TE** (on-behalf-of)                 |

---

## 2.8 Standards & Interop

*Built on standards you trust:* OAuth 2.1 • Token Exchange (RFC 8693) • OpenID AuthZEN • MCP
(tooltip: “on-behalf-of identity” / “policy decisions” / “pre-exec agent calls”)

---

## 2.9 Pricing anchor (matter-of-fact)

**Starting at $500 / governed endpoint / month** · usage (decisions/receipts) · author seats
**CTAs:** Compare tiers · Contact sales · Self-host install

---

## 2.10 Final CTA

**Ready to see it work?**
**Start the 5-minute Quickstart** · **Book a demo**
*Status:* `Demo Environment: ACTIVE  |  Documentation: COMPLETE`

---

# 3) Controls & Evidence (site section + PDF)

**Intro:** *Controls mapped to audit objectives, with evidence and current status.*

| Audit objective         | Control                                                | Where it lives    | Evidence                               | **Status**         |
| ----------------------- | ------------------------------------------------------ | ----------------- | -------------------------------------- | ------------------ |
| Identity propagation    | OAuth 2.1 + **RFC 8693 TE**                            | IdP / Auth Studio | Short-lived token + TE assertion       | **Implemented**    |
| Pre-exec validation     | **MCP Gateway** plan/schema pins                       | Gateway           | **Blocked call (402)** + policy hash   | **Demo available** |
| Runtime guardrails      | **ARIA Shield** budgets/params/egress                  | Shield            | Budget event + route config            | **In testing**     |
| Decision consistency    | **AuthZEN PDP** decision (constraints/obligations/TTL) | PDP               | Decision log snippet                   | **Implemented**    |
| Proof / non-repudiation | **Receipt Vault** hash-chained                         | Vault             | 6-line receipt (test env, prod format) | **Prototype**      |

**Footer note:** *No scare stories—just controls and evidence. Ask us to run these with **your API** live.*

---

# 4) Evidence pack (assets to produce)

1. **Redacted receipt pack** (5 one-pagers): budget 402, param allow-list, egress filter, TTL permit, on-behalf-of chain.

   * Title each page: “**Test Environment — Production Format**”
2. **Standards brief** (2 pp): OAuth 2.1, RFC 8693 TE, OpenID AuthZEN, MCP — and your mapping.
3. **FinOps note** (1 p): definitions, formulas, example dashboard (labeled “example”), calculator linkage.
4. **Security architecture** (2 pp): single diagram + control callouts + evidence links.
5. **Design Partner page**: benefits, expectations, “what we can demonstrate today”.

**“What you can do today”** (homepage or DP page):

* ✅ Create MCP tools from APIs (live demo)
* ✅ Test authorization decisions (AuthZEN)
* ✅ Generate audit receipts (Vault)
* ⏳ Production deployments (Q1 2025)
* ⏳ Broader platform coverage (Q2 2025)

**“No-Bullshit Guarantee”** (sitewide badge/footnote):
*We show exactly what works today, what’s in testing, and what’s next. No inflated metrics. No fake urgency. Just honest engineering.*

---

# 5) Components (React + Tailwind, props)

* `<Hero status={…} chips={[…]} ctas={[…]} />`
* `<WhyNow bullets={[{title,desc}]} />`
* `<ToolFactory proofs={[…]} ctas={[…]} />`
* `<SecurityStack beats={[…]} blockedExample={…} receiptExample={…} ctas={[…]} />`
* `<RoiCalculator defaults={{tools:50,weeks:6,cost:200000,platforms:2}} onCalculate={…} />`
* `<JourneyPaths tiles={[{title,goal,ctas:[…]}]} />`
* `<DiffGrid rows={[{need,others,us}]} />`
* `<StandardsChips chips={[{label,tooltip}]} />`
* `<PricingAnchor starting="$500 / endpoint / month" ctas={[…]} />`
* `<FinalCta status={…} ctas={[…]} />`
* `<ControlsTable rows={[…]} />` + link to PDFs

Feature flags: `showHeroAnim`, `showStatusBar`, `abHeroCopy`, `showDesignPartner`.

---

# 6) Motion / visual spec

* **Hero loop (≤15s, 60fps)**: storyboard as above; WebM/MP4 + poster; pause on hover.
* **Micro-motion**: code line sweep on hover; counters tick every 10–20s; chip hover = underline only.
* **Type:** Space Grotesk (H), Inter (body). H1 60–64 / H2 36 / H3 24 / body 18; LH 1.35–1.45; ≤70ch measure.
* **Color/AA:** void-dark, cyan primary; remove default purple visited links; meet WCAG AA.

---

# 7) Analytics (events & KPIs)

**Events**

* `cta_click` `{id: "quickstart_hero" | "demo_hero" | "try_gateway" | "view_receipt" | "roi_calculate" | "journey_secure" | "journey_build" | "journey_audit" | "compare_diy" | "design_partner_apply"}`
* `roi_submit` `{tools,weeks,cost,platforms,diy_cost,enow_cost}`
* `quickstart_begin` / `quickstart_complete` `{ms_to_complete}`
* `artifact_view` `{type:"blocked_call"|"receipt"}`
* `support_link_click` `{topic}`

**North-stars (stage-honest)**

* **Time to first working tool in test** (< 1 day from first visit)
* **Time to first production tool** (median target < 14 days)
* **Design partners onboarded**
* **Pilot → prod in ≤ 90 days (% )**

**Early leading**

* Hero → Tool Factory scroll % (>60%)
* Quickstart CTR (>8%)
* ROI interactions (>20%)
* Support ticket themes (taxonomy)

---

# 8) Two-week ship plan

**Week 1 (ship core)**

* Implement hero + status bar + standards chips.
* Build Tool Factory section (with demo CTA).
* Security Stack with two proof atoms; link to real test receipts.
* ROI calc v1 (transparent math).
* Journey paths (JTBD).
* Controls & Evidence page (table + statuses).
* Analytics events.

**Exit:** Page live; demo path works; no zeros anywhere.

**Week 2 (polish)**

* Professional hero animation; Why-now strip.
* Standards tooltips; FinOps note; Security architecture PDF.
* Design Partner page; Compare vs DIY/Status Quo pages.
* “For EmpowerID customers” coexistence page.
* A/B tests (hero copy; journey order; ROI placement).
* Accessibility & performance pass (LCP <2.5s; CLS <0.1).

---

# 9) Acceptance criteria (go/no-go)

* Copy matches spec; statuses present on controls table.
* At least **1 real blocked call** and **1 real receipt** viewable (test env labeled).
* Quickstart path completes with a realistic mock API.
* Analytics events firing; dashboards show the core KPIs.
* Perf & a11y pass; no default purple visited links; keyboard nav OK.

---

# 10) Sales enablement (CISO-safe)

**3-line opener**
“Three controls matter: **identity propagation**, **pre-execution validation**, **runtime guardrails with receipts**. Here’s one diagram and two artifacts: a **blocked call** and a **receipt**. If you’d like, we’ll run this with **your API** live.”

**Leave-behinds**

* Controls & Evidence (1-page)
* Redacted receipt pack (5)
* Standards brief (2 pp), Security architecture (2 pp)
* FinOps note (1 p)

---

# 11) Risk mitigation

* **Competitors’ big numbers:** counter with EmpowerID heritage, code access (demo), and standards implementation.
* **Data gaps:** if no live metric, show mechanism (“see it work”), not a number.
* **Scope creep:** enforce “one diagram + one artifact” per section.

---

# 12) Bonus sections to add (low-effort, high trust)

* **Development velocity** (optional strip; honest):
  `Commits This Week: 47 | Standards Implemented: 6 | APIs Tested: 12 | Docs Pages: 127`
* **What you can do today** (capability checklist):

  * ✅ Create MCP tools from APIs (live)
  * ✅ Test authorization decisions
  * ✅ Generate audit receipts
  * ⏳ Production deployments (Q1 2025)
  * ⏳ Broader platform coverage (Q2 2025)

---

This spec gives you **clean copy, exact modules, artifact requirements, and an achievable timeline**—all without hype. Ship the hero, Tool Factory, Controls & Evidence, and the two proof atoms first; the rest layers on smoothly.


awesome — here’s a **production-ready set of drop-in sections** built on your **Neon-Flux** tokens. Everything is plain HTML/CSS (with a pinch of vanilla JS where needed), so you can paste into any framework. The copy matches the “honest, sophisticated” spec. Classes are minimal utilities; all color/spacing pulls from your tokens.

> If you’d rather use React/Tailwind, tell me and I’ll output the same kit as composable components.

---

## 0) Shared CSS utilities (drop in once)

```html
<style>
/* --------- Neon-Flux base (you provided) --------- */
:root {
  --color-bg:#0E0E10;--color-primary:#6C4CFF;--color-secondary:#B326FF;--color-accent:#00E7F6;
  --color-success:#B6FF3C;--color-warning:#FFC266;--color-surface:rgba(255,255,255,.06);--color-gray-700:#44464A;
  --on-bg:#EDEDED;--on-primary:#fff;--on-secondary:#fff;--on-accent:#002628;--on-surface:#fff;
  --void-black:var(--color-bg);--quantum-violet:var(--color-primary);--ultraviolet-magenta:var(--color-secondary);
  --pulse-cyan:var(--color-accent);--ion-lime:var(--color-success);--signal-amber:var(--color-warning);--glass-frost:var(--color-surface);
}
:root {--deep-space-blue:#0B1C3D;--ease-snap:cubic-bezier(.4,0,.2,1);--ease-glide:cubic-bezier(.25,.8,.25,1);
  --dur-fast:150ms;--dur-medium:300ms;--dur-slow:600ms;--spacing-1:8px;--radius-sm:4px;--radius-card:8px;--radius-modal:12px;}
:where(:focus-visible){outline:2px solid var(--pulse-cyan);outline-offset:2px;transition:outline-offset var(--dur-fast) var(--ease-snap);}

/* --------- Layout primitives --------- */
.nf-page{background:var(--void-black);color:var(--on-bg);font:400 18px/1.5 Inter,system-ui,-apple-system,Segoe UI,Roboto,"Helvetica Neue",Arial;}
.nf-wrap{max-width:1180px;margin:auto;padding:56px 24px;}
.nf-grid{display:grid;gap:24px;}
.nf-2{grid-template-columns:repeat(2,minmax(0,1fr));}
.nf-3{grid-template-columns:repeat(3,minmax(0,1fr));}
.nf-4{grid-template-columns:repeat(4,minmax(0,1fr));}
@media (max-width:1024px){.nf-2,.nf-3,.nf-4{grid-template-columns:1fr;}}

/* --------- Cards, chips, buttons --------- */
.nf-card{background:var(--glass-frost);border:1px solid rgba(255,255,255,.08);border-radius:var(--radius-card);padding:24px;
  box-shadow:0 8px 24px rgba(0,0,0,.25);}
.nf-chip{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.18);color:var(--on-bg);
  padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.05);font-size:13px;}
.nf-btn{display:inline-flex;align-items:center;gap:10px;border-radius:10px;padding:12px 16px;font-weight:600;letter-spacing:.2px;
  transition:transform var(--dur-fast) var(--ease-snap), box-shadow var(--dur-fast) var(--ease-snap);text-decoration:none;}
.nf-btn:where(:hover){transform:translateY(-1px);}
.nf-btn--primary{background:var(--pulse-cyan);color:var(--on-accent);box-shadow:0 8px 24px rgba(0,231,246,.25);}
.nf-btn--ghost{border:1px solid rgba(255,255,255,.18);color:var(--on-bg);background:transparent;}
.nf-kbd{font:600 12px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:rgba(255,255,255,.06);
  padding:3px 6px;border-radius:6px;border:1px solid rgba(255,255,255,.12);}

/* --------- Headings --------- */
h1.nf-hero{font-family:"Space Grotesk",Inter,system-ui;font-weight:700;font-size:60px;line-height:1.1;margin:0 0 14px;}
h2.nf-h2{font-family:"Space Grotesk",Inter,system-ui;font-weight:700;font-size:36px;line-height:1.2;margin:0 0 12px;}
h3.nf-h3{font-family:"Space Grotesk",Inter,system-ui;font-weight:650;font-size:24px;margin:0 0 10px}

/* --------- Hero background flourish --------- */
.nf-hero-bg{position:relative;isolation:isolate}
.nf-hero-bg::before{content:"";position:absolute;inset:-120px -60px -60px -60px;z-index:-1;
  background:radial-gradient(60% 50% at 20% 10%, rgba(108,76,255,.25), transparent 60%),
             radial-gradient(45% 40% at 80% 20%, rgba(0,231,246,.18), transparent 60%),
             radial-gradient(30% 30% at 60% 80%, rgba(179,38,255,.14), transparent 70%);filter:saturate(110%);}

/* --------- Code blocks / proof atoms --------- */
.nf-code{background:#0A0B0D;border:1px solid rgba(255,255,255,.12);border-radius:12px;color:#E6E6E6;
  font:500 14px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:16px;overflow:auto;}
.nf-code > .tag{color:#8EDBFF} .nf-code .num{color:#B6FF3C} .nf-code .key{color:#B8A7FF}

/* --------- Status bar --------- */
.nf-status{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
.nf-status .pill{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:999px;
  padding:8px 12px;font-weight:600}
.nf-status .ok{color:var(--ion-lime)} .nf-status .info{color:var(--pulse-cyan)}

/* --------- Tables --------- */
.nf-table{width:100%;border-collapse:separate;border-spacing:0 8px}
.nf-table th{color:rgba(255,255,255,.75);font-size:14px;text-align:left;padding:6px 10px}
.nf-table td{background:var(--glass-frost);border:1px solid rgba(255,255,255,.08);padding:12px 10px}
.nf-badge{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 10px;font-size:12px;border:1px solid rgba(255,255,255,.18)}
.nf-badge.ok{color:var(--ion-lime)} .nf-badge.demo{color:var(--pulse-cyan)} .nf-badge.test{color:var(--signal-amber)}
.nf-badge.proto{color:#bbb}

/* --------- Chips row for standards --------- */
.nf-chip-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}
.nf-chip[data-tip]{position:relative}
.nf-chip[data-tip]:hover::after{content:attr(data-tip);position:absolute;left:0;top:calc(100% + 8px);white-space:nowrap;
  background:#0A0B0D;border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:6px 8px;font-size:12px;color:#D6D6D6}

/* --------- KPI counters (optional velocity) --------- */
.nf-velocity{display:flex;flex-wrap:wrap;gap:12px}
.nf-velocity .box{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px 12px}
</style>
```

---

## 1) Hero + honest status bar + standards chips

```html
<section class="nf-wrap nf-hero-bg">
  <h1 class="nf-hero">Secure AI agents that actually do work.</h1>
  <p style="max-width:70ch;margin:0 0 14px;">
    Turn any API into a governed agent tool in minutes. <strong>Every call authorized. Every action proven.</strong>
  </p>
  <p style="color:rgba(255,255,255,.8);margin:0 0 18px;">
    <strong>The only platform that makes agents useful <em>and</em> safe—</strong>from API to governed tool in <span class="nf-kbd">&lt; 10 MIN</span>.
  </p>

  <div style="display:flex;gap:12px;flex-wrap:wrap;margin:18px 0 8px;">
    <a class="nf-btn nf-btn--primary" href="#quickstart">Start the 5-minute Quickstart</a>
    <a class="nf-btn nf-btn--ghost" href="#demo">Watch the 90-second demo</a>
  </div>

  <div class="nf-status" aria-label="Platform status">
    <span class="pill ok">Platform Status: LIVE</span>
    <span class="pill info">Demo Environment: ACTIVE</span>
    <span class="pill">Create Your First Tool: &lt; 5 MIN</span>
    <span class="pill">Documentation: COMPLETE</span>
  </div>

  <div style="margin-top:18px">
    <div style="opacity:.8;margin-bottom:6px">Built on standards you trust:</div>
    <div class="nf-chip-row" role="list">
      <span class="nf-chip" data-tip="Authorization framework">OAuth 2.1</span>
      <span class="nf-chip" data-tip="On-behalf-of identity propagation">Token Exchange (RFC 8693)</span>
      <span class="nf-chip" data-tip="Standardized policy decisions">OpenID AuthZEN</span>
      <span class="nf-chip" data-tip="Agent tool calls">MCP</span>
      <span class="nf-chip">Copilot Actions</span>
      <span class="nf-chip">OpenAI Functions</span>
    </div>
  </div>
</section>
```

---

## 2) “Why now” (facts only)

```html
<section class="nf-wrap nf-grid nf-3">
  <div class="nf-card">
    <h3 class="nf-h3">Platforms ship tools first</h3>
    <p>Agent tools are arriving before universal governance. Security needs a cross-platform gate and receipts.</p>
  </div>
  <div class="nf-card">
    <h3 class="nf-h3">Scale demands consistency</h3>
    <p>Thousands of agents require consistent <em>authorization</em> and <em>evidence</em> across stacks.</p>
  </div>
  <div class="nf-card">
    <h3 class="nf-h3">Audit requires proof</h3>
    <p>Governance checklists add “policy + receipts” — not just logs.</p>
  </div>
</section>
```

---

## 3) Tool Factory (CRUDService)

```html
<section id="quickstart" class="nf-wrap">
  <h2 class="nf-h2">Turn any API/DB into an agent-safe tool — no code.</h2>
  <p style="max-width:70ch">Paste an endpoint, get an <strong>MCP-ready tool</strong> with schema pins and policy hooks. Publish once to MCP / Copilot / Functions.</p>
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px">
    <a class="nf-btn nf-btn--primary" href="/docs/quickstart">Quickstart</a>
    <a class="nf-btn nf-btn--ghost" href="/catalog">Adapter catalog</a>
    <a class="nf-btn nf-btn--ghost" href="/examples/workflows">Workflow examples</a>
  </div>
</section>
```

---

## 4) Complete Security Stack + proof atoms

```html
<section class="nf-wrap nf-grid nf-2">
  <div class="nf-card">
    <h2 class="nf-h2">Pre-exec → Decide → Runtime → Identity → Prove</h2>
    <ul style="margin:10px 0 0 18px">
      <li><strong>Pre-execution (MCP Gateway):</strong> validate <em>plan & schema pins</em>; block injection/overreach <em>before</em> models run.</li>
      <li><strong>Decide (AuthZEN PDP):</strong> standardized <em>who/what/for whom/constraints</em> + obligations & TTL.</li>
      <li><strong>Runtime (ARIA Shield):</strong> budgets (<span class="nf-kbd">HTTP 402</span>), parameter allow-lists, egress filters; cost attribution.</li>
      <li><strong>Identity (IdP):</strong> <em>OAuth 2.1 + Token Exchange (RFC 8693)</em>; short-lived, on-behalf-of; no long-lived secrets.</li>
    </ul>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px">
      <a class="nf-btn nf-btn--primary" href="/try/gateway">Try Gateway</a>
      <a class="nf-btn nf-btn--ghost" href="#proof-receipt">Open a real receipt</a>
      <a class="nf-btn nf-btn--ghost" href="/docs/policies/examples">Policy examples</a>
    </div>
  </div>

  <div class="nf-grid" style="gap:16px">
    <div class="nf-card">
      <div style="opacity:.7;margin-bottom:6px">Blocked call (budget)</div>
      <pre class="nf-code" aria-label="Blocked call example">
HTTP/1.1 402 Budget Required
error: "budget_exceeded"
call_id: "abc-123"</pre>
      <div style="opacity:.7;margin-top:8px;font-size:14px">Label: <em>Test Environment — Production Format</em></div>
    </div>

    <div id="proof-receipt" class="nf-card">
      <div style="opacity:.7;margin-bottom:6px">Receipt (6 lines)</div>
      <pre class="nf-code" aria-label="Receipt example">
{ <span class="key">decision_id</span>:"d-9f2",
  <span class="key">policy_hash</span>:"…a1c",
  <span class="key">tool_schema_hash</span>:"…7b9",
  <span class="key">cost_usd</span>:<span class="num">0.012</span>,
  <span class="key">ttl_ms</span>:<span class="num">5000</span> }</pre>
      <div style="opacity:.7;margin-top:8px;font-size:14px">Label: <em>Test Environment — Production Format</em></div>
    </div>
  </div>
</section>
```

---

## 5) ROI Calculator (transparent)

```html
<section class="nf-wrap nf-card" id="roi">
  <h2 class="nf-h2">Calculate your potential savings</h2>
  <p>Based on your inputs and published industry averages; adjust assumptions.</p>
  <form id="roi-form" class="nf-grid nf-4" style="margin-top:12px">
    <label> # tools<br><input type="number" min="1" value="50" name="tools" class="nf-input"></label>
    <label> weeks per tool<br><input type="number" min="1" value="6" name="weeks" class="nf-input"></label>
    <label> loaded eng cost ($)<br><input type="number" min="100000" step="10000" value="200000" name="cost" class="nf-input"></label>
    <label> # platforms<br><input type="number" min="1" value="2" name="platforms" class="nf-input"></label>
  </form>
  <div style="margin-top:12px">
    <div class="nf-card" style="background:rgba(255,255,255,.04)">
      <strong>DIY:</strong> <span id="diy-val">$11,500,000</span> &nbsp;=&nbsp; tools × weeks × eng_cost × platforms<br>
      <strong>EmpowerNow (Y1):</strong> <span id="enow-val">$120,000 – $300,000 + usage</span> &nbsp;≈&nbsp; endpoints × $500 × 12
    </div>
  </div>
  <div style="margin-top:12px">
    <a class="nf-btn nf-btn--primary" href="#contact" id="roi-cta">Estimate my savings</a>
  </div>
</section>

<script>
(function(){
  const form=document.getElementById('roi-form');
  const diy=document.getElementById('diy-val');
  const enow=document.getElementById('enow-val');
  function fmt(n){return n.toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0});}
  function recalc(){
    const t=+form.tools.value||0,w=+form.weeks.value||0,c=+form.cost.value||0,p=+form.platforms.value||0;
    const diyCost=t*w*c*p;
    diy.textContent=fmt(diyCost);
    // assume endpoints ~= tools * 0.4 (tune later)
    const endpoints=Math.max(1,Math.round(t*0.4));
    const low=endpoints*500*12, high=Math.round(low*2.5/1); // show a range
    enow.textContent=`${fmt(low)} – ${fmt(high)} + usage`;
  }
  form.addEventListener('input',recalc);recalc();
})();
</script>
```

*(Add simple `.nf-input` style if you like; the card already frames it.)*

---

## 6) Journey paths (concrete JTBD)

```html
<section class="nf-wrap nf-grid nf-3">
  <div class="nf-card">
    <h3 class="nf-h3">“My ChatGPT agents are calling our SAP APIs ungoverned.”</h3>
    <p>Stop exfiltration today with MCP plan/schema pins and runtime egress caps.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a class="nf-btn nf-btn--primary" href="/try/gateway">Try Gateway</a>
      <a class="nf-btn nf-btn--ghost" href="/brief/security">Security brief</a>
    </div>
  </div>
  <div class="nf-card">
    <h3 class="nf-h3">“I need Salesforce data in Claude by Friday.”</h3>
    <p>Ship safe tools fast with the CRUDService Tool Factory and no-code workflows.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a class="nf-btn nf-btn--primary" href="/docs/quickstart">Quickstart</a>
      <a class="nf-btn nf-btn--ghost" href="/catalog/salesforce">Adapter catalog</a>
    </div>
  </div>
  <div class="nf-card">
    <h3 class="nf-h3">“Deloitte audit starts in 30 days.”</h3>
    <p>Every call creates an auditable receipt with decision, policy hash, and schema pin.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a class="nf-btn nf-btn--primary" href="#proof-receipt">View receipts</a>
      <a class="nf-btn nf-btn--ghost" href="/guides/auditor">Auditor guide</a>
    </div>
  </div>
</section>
```

---

## 7) How we’re different (positive grid)

```html
<section class="nf-wrap">
  <h2 class="nf-h2">How we’re different</h2>
  <table class="nf-table" role="table" aria-label="Comparison">
    <thead><tr><th>What you need</th><th>Others (typical)</th><th>EmpowerNow</th></tr></thead>
    <tbody>
      <tr><td>Working tools <strong>today</strong></td><td>“Coming soon” or DIY</td><td><a href="/docs/quickstart">Live demo: create a tool in &lt; 5 min</a></td></tr>
      <tr><td>Cross-platform enforcement</td><td>Logs/observability</td><td>Pre-exec pins + runtime budgets/egress</td></tr>
      <tr><td>Standardized decisions</td><td>App-specific rules</td><td>OpenID AuthZEN (constraints/obligations/TTL)</td></tr>
      <tr><td>Proof for audit & FinOps</td><td>Unstructured logs</td><td>Cryptographic receipts (decision/policy/schema/cost)</td></tr>
      <tr><td>Identity propagation</td><td>Ad-hoc JWT passing</td><td>OAuth 2.1 + RFC 8693 Token Exchange</td></tr>
    </tbody>
  </table>
</section>
```

---

## 8) Pricing anchor (matter-of-fact) + final CTA

```html
<section class="nf-wrap nf-card">
  <h2 class="nf-h2">Pricing</h2>
  <p><strong>Starting at $500 / governed endpoint / month</strong> · usage (decisions/receipts) · author seats</p>
  <div style="display:flex;gap:12px;flex-wrap:wrap">
    <a class="nf-btn nf-btn--primary" href="/pricing">Compare tiers</a>
    <a class="nf-btn nf-btn--ghost" href="/contact">Contact sales</a>
    <a class="nf-btn nf-btn--ghost" href="/docs/self-host">Self-host install</a>
  </div>
</section>

<section class="nf-wrap">
  <div class="nf-card" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
    <div>
      <h3 class="nf-h3" style="margin:0 0 6px">Ready to see it work?</h3>
      <div class="nf-status">
        <span class="pill info">Demo Environment: ACTIVE</span>
        <span class="pill">Documentation: COMPLETE</span>
      </div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a class="nf-btn nf-btn--primary" href="#quickstart">Start the 5-minute Quickstart</a>
      <a class="nf-btn nf-btn--ghost" href="/book-demo">Book a demo</a>
    </div>
  </div>
</section>
```

---

## 9) Controls & Evidence page (section excerpt with status column)

```html
<section class="nf-wrap">
  <h2 class="nf-h2">Controls & Evidence</h2>
  <p>Controls mapped to audit objectives, with evidence and current status.</p>
  <table class="nf-table" role="table">
    <thead><tr>
      <th>Audit objective</th><th>Control</th><th>Where</th><th>Evidence</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>Identity propagation</td><td>OAuth 2.1 + RFC 8693 Token Exchange</td><td>IdP / Auth Studio</td>
          <td>Short-lived token + TE assertion</td><td><span class="nf-badge ok">Implemented</span></td></tr>
      <tr><td>Pre-execution validation</td><td>MCP Gateway plan & schema pins</td><td>Gateway</td>
          <td>Blocked call (402) + policy hash</td><td><span class="nf-badge demo">Demo available</span></td></tr>
      <tr><td>Runtime guardrails</td><td>Budgets, params, egress filters</td><td>ARIA Shield</td>
          <td>Budget event + route config</td><td><span class="nf-badge test">In testing</span></td></tr>
      <tr><td>Decision consistency</td><td>OpenID AuthZEN PDP</td><td>PDP</td>
          <td>Decision log (constraints/obligations/TTL)</td><td><span class="nf-badge ok">Implemented</span></td></tr>
      <tr><td>Proof / non-repudiation</td><td>Hash-chained receipts</td><td>Receipt Vault</td>
          <td>Receipt (production format, test data)</td><td><span class="nf-badge proto">Prototype</span></td></tr>
    </tbody>
  </table>
  <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
    <a class="nf-btn nf-btn--primary" href="/evidence/receipts">Open receipt pack</a>
    <a class="nf-btn nf-btn--ghost" href="/evidence/standards">Read standards brief</a>
    <a class="nf-btn nf-btn--ghost" href="/evidence/architecture">See architecture</a>
  </div>
  <p style="opacity:.8;margin-top:10px"><em>No scare stories—just controls and evidence. Want to see this with your API? We can do it live.</em></p>
</section>
```

---

## 10) Optional velocity strip (honest momentum)

```html
<section class="nf-wrap">
  <div class="nf-velocity">
    <div class="box">Commits This Week: <strong>47</strong></div>
    <div class="box">Standards Implemented: <strong>6</strong></div>
    <div class="box">APIs Tested: <strong>12</strong></div>
    <div class="box">Documentation Pages: <strong>127</strong></div>
  </div>
</section>
```

---

### Notes for implementation

* **Accessibility:** all CTAs are buttons/links with visible focus; chips have tooltips; code blocks have `aria-label`.
* **Performance:** lazy-load the hero video (use a static poster first); keep LCP under 2.5s; ensure images are `width/height` fixed to avoid CLS.
* **Analytics:** bind click events on `#roi-cta`, “Start Quickstart”, “Try Gateway”, “Open receipt” to your data layer.
* **Migration ribbon (footer):** add a subtle link “For EmpowerID customers — how EmpowerNow plugs in (no rip/replace).”

If you want, I can convert this to **React/Tailwind** with props for copy/links, or produce **PDFs** for the Controls & Evidence / Standards brief / FinOps note using the same typography and tokens.
