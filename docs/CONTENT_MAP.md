# Produced Content Map (docs/)

Last updated: 2025-09-20

This map inventories the produced documentation under `docs/`, grouped by section, sets canonical hubs, and flags overlaps to avoid duplication. Use this to slot new content and link from overview pages.

## Canonical hubs
- Website copy (public): `website_copy/*` — product pages, solutions, pricing, nav.
- Marketing (public): `marketing/index.md` and subfolders — narratives, positioning, campaigns.
- Services (technical docs): `services/*` — per-service IA using Diátaxis (explanation, how-to, reference, tutorials).
- SDKs (technical): `sdks/*` — language guides and index.
- Personas (marketing/internal): `personas/*` — audience definitions.
- Enablement (training): `enablement/*` — study guides and internal materials.

---

## Website copy (Public/Web)
- Product pages: `product_bff.md`, `product_gateway.md`, `product_idp.md`, `product_membership.md`, `product_pdp.md`, `product_receipts.md`, `product_registry.md`, `product_orchestration.md`, `product_hub.md`, `products.md`.
- Solutions: `solutions.md`, `solutions_hub.md`, `solution_devsecops.md`, `solution_finops.md`, `solution_regulated.md`, `solution_saas.md`.
- Company/trust: `company.md`, `trust.md`.
- Resources: `resources.md`, `resources_hub.md`, `resources_demo.md`, `resources_whitepaper.md`.
- Site framework: `homepage.md`, `hero.md`, `nav.md`, `footer.md`, `site-map.md`, `seo_meta.md`, `seo_og.md`, `seo_schema.md`, `combined_preview.md`.
- Quality/ops (internal site-workflow): `qa_checklist.md`, `ab_testing.md`, `lighthouse_checklist.md`, `css_guidelines.md`, `responsiveness_guidelines.md`, `mermaid_standards.md`, `staging_deploy.md`.

Overlaps: product pages sometimes restate deep technical claims (capabilities, flags). Action: keep technical depth in `services/*` and link from product pages.

---

## Marketing (Public)
- Top-level: `marketing/index.md`, `positioning.md`, `competitive.md`, `go-to-market.md`, `packaging-pricing.md`, `fabric-plus-iga.md`, `identity-fabric-standards.md`, `naming-service.md`, `experience-app.md`, `authzen-pdp.md`, `studio-backend-mapping.md`, `automation-vs-zapier-make-n8n.md`.
- Loopback MCP campaign: `marketing/loopback-mcp/*` — `landing.md` (canonical), `announcement.md`, `deep-dive.md`, `one-pager.md`, `press-blurb.md`, `seo.md`, `social-snippets.md`.

Overlaps: loopback content cross-cuts `services/bff` and `services/crud-service`. Action: link marketing pages to the corresponding service how‑tos/tutorials, avoid duplicating steps.

---

## Services (Technical Docs)

### BFF (canonical index: `services/bff/index.md`)
- Explanation (architecture and concepts): `explanation/*` (e.g., `architecture.md`, `authorization.md`, `security-model.md`, `bff_gateway.md`, `bff_gateway_technical.md`).
- How‑to: `how-to/*` (canonical task guides; 50+ pages). Use these as the target for step-by-step tasks referenced from marketing or website copy.
- Reference: `reference/*` (config/flags/routes/observability, etc.). Treat as the single source of truth for settings; link from runbooks/FAQs.
- Tutorials: `tutorials/*` — end-to-end flows (limited set).
- DevOps: `devops/*` — environment routing, mTLS, proxies.

Overlaps: `bff_gateway.md` appears in both explanation and website product pages (gateway). Action: keep `services/bff/explanation/bff_gateway.md` as technical canonical; make website product pages link without copying tables.

### CRUD Service (`services/crud-service/index.md`)
- Explanation/how‑to/reference/tutorials present. Secrets folder contains internal docs and PDFs.

Overlaps: CRUD Service MCP docs vs Marketing loopback MCP. Action: retain technical depth in services; marketing links in/out.

### PDP (`services/pdp/index.md`)
- Explanation: 14 pages (architecture, policy, integrity, etc.).
- How‑to: 4 pages (admin tasks).
- Reference: 1 page (expand as APIs mature).

Overlaps: Ensure flags/reference live under reference, not in how‑tos.

### Membership (`services/membership/index.md`)
- Explanation/how‑to/reference present; fill out reference as APIs stabilize.

### NowConnect (`services/nowconnect/index.md`)
- Explanation/how‑to/reference present; includes PDFs (keep internal/public distinction).

### Experience (`services/experience/index.md`)
- Quickstart, API reference, security, plugins, versioning.

### Aria Shield (`services/aria-shield/index.md`)
- Executive/PM overviews, seven controls, capability proofs, receipts, tool schema attestation, intro architecture, patent portfolio.

Overlaps: Executive/PM overviews vs website product pages. Action: keep PM pages in services for product management; website pages link at a higher level.

---

## SDKs (Technical)
- `sdks/index.md`, `sdks/python.md`, `sdks/npm.md` — language guides. Add cross-links from service how‑tos where SDK usage is shown.

---

## Personas (Internal/Marketing)
- Audience pages for admins, auditors, backend, frontend, devops, testers, security, sales, developers, end‑users. Use to drive crosslinks and TOCs on website copy.

---

## Enablement (Training)
- `enablement/product-review-study-guide.md` — training/internal enablement.

---

## Cross‑section overlaps and canonical decisions
- Gateway narratives: Website `product_gateway.md` vs BFF `explanation/bff_gateway.md` vs marketing pages.
  - Canonical technical: `services/bff/explanation/bff_gateway.md` and `services/bff/explanation/bff_gateway_technical.md`.
  - Website copies high level only; links to technical.
- MCP Loopback: Marketing loopback‑mcp vs Services (BFF/CRUD how‑tos).
  - Canonical technical: services how‑tos/tutorials; marketing links.
- Aria Shield controls and receipts: Services aria‑shield vs website product_receipts.md.
  - Canonical technical: services/aria‑shield; website summarizes.

---

## Slotting rubric (produced docs)
1) For public pages, prefer `website_copy/*` or `marketing/*`. Keep technical depth in `services/*` and link out.
2) For technical tasks/configs, create/update under the relevant service’s `how-to/` or `reference/`.
3) For architecture/explanations, use the service’s `explanation/` and add diagrams there.
4) For SDK usage, add/update under `sdks/*` and cross‑link from service docs.
5) Avoid duplicating configuration tables across website/marketing; always link to `services/*/reference/*`.

---

## Immediate actions to reduce duplication
- Add “See also” blocks from website product pages to the corresponding service explanation/how‑to pages.
- Ensure gateway/receipts claims on website link to `services/aria-shield/*` and `services/bff/reference/*` instead of restating flags.
- In BFF service docs, reference a single config overview and settings pages; remove repeated tables in how‑tos where found.
