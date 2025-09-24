### OSO “Authorization in LLM Applications” vs. ARIA Shield BFF

| Topic | OSO guidance | ARIA Shield v1 today | Gaps/opportunities |
|---|---|---|---|
| Effective permissions (LLM ∩ user ∩ task) | Bound LLM with least privilege; intersect LLM, user, task permissions | Intersection via PDP constraints + capability checks (user), schema pins/param‑allowlists/plan steps (task), and gateway limits (LLM) | Expose the “task box” explicitly: single‑use transaction tokens bound to tool+params+decision |
| Impersonation & identity separation | LLM acts on behalf of user; keep identity out of prompt | Pairwise user↔agent binding; IdP token exchange; BFF/ARIA never rely on prompt for auth | Standardize a signed, out‑of‑band context envelope passed to tools, verified by tools |
| Where to authorize (first‑party RAG) | Authorize at application layer when associating embeddings with source data | Data‑scope constraints (`row_filter_sql`); enforcement lives at PEPs; no RAG‑specific proxy in v1 docs | Provide a RAG proxy/sidecar that always applies PDP‑derived filters before retrieval |
| Third‑party RAG strategies | Delegate to source (simple but slow), sync ACLs (heavy), or replicate logic (brittle) | Identity chaining (IdP/PDP), membership PIP for constraints; no explicit RAG strategy guide | Ship a decision tree: 1) identity chain to source; 2) namespaced subject pools; 3) minimal metadata sync for filterable attrs |
| Agents & MCP | Standardize tools via MCP; authorize on tool boundary, not by LLM | MCP‑aware ARIA Gateway: schema pins, PDP checks, egress pinning, plan steps, receipts | Add toolside PEP SDK + transaction token verification; signed permission grants for discovery |
| OAuth limits | Use OAuth for identity; not for resource‑level authorization | OAuth only for issuance (token exchange). Resource decisions via PDP/PEP | Aligns; document explicitly in developer guides |
| Confused deputy | Backend re‑authz with trusted side channel | Pairwise identity, PDP evaluation, egress allowlists; headers `X-Delegator-ID`/`X-Agent-ID` | Replace headers with signed context envelope + PoP/mTLS binding |
| Task bounding | Bound to specific actions/objects | Plan JWS (step), schema pins, param allowlists, max steps | Add per‑call “uses:1” transaction token; include constraints fingerprint |
| Auditability | Not emphasized | Signed, hash‑chained receipts with policy snapshot | Include constraints fingerprint and decision_id in receipts (not just snapshot) |
| Budgets | Not core focus | Stream‑time budget hold/settle; PDP live budgets via Analytics | Clear differentiator; surface spend snapshot in context envelope to tools |

### How ARIA maps to OSO’s “effective permissions”
- LLM permissions: ARIA Gateway/BFF constraints (models, egress, tokens) + schema pins effectively bound the “LLM’s box.”
- User permissions: Membership PIP + pairwise identities + PDP capability/resource checks enforce the user side.
- Task permissions: Plan JWS step index, params fingerprints, and allowlists encode the task‑specific boundary.

Net: ARIA already implements the intersection in practice; make it explicit with per‑call transaction tokens and a signed context envelope.

### Priority gaps to close (high impact, low churn)
1) Signed context envelope (tool call side channel)
- JWS header: `kid`, `alg`; payload: `{agent_id, bound_user, tenant_id, decision_id, data_scope(row_filter_sql, tenant_ids), constraints_fp, call_id, exp}`.
- Gateway signs; tools verify via JWKS; reject on invalid/expired.

2) Single‑use transaction tokens
- Short‑TTL, uses=1, bound to `{tool_id, params_hash, agent_id, decision_id}`; verified by gateway and tool to prevent replay/deputy issues.

3) RAG proxy/sidecar
- Library/proxy that applies PDP data‑scope before vector search and when dereferencing context; supports identity chaining for third‑party sources.

4) Toolside PEP SDK
- Verify envelope + transaction token; helpers for column masks and consent checks; Python/Node first.

5) PoP + mTLS defaults
- Require PoP at ARIA Gateway (dev override allowed); SPIFFE/mTLS for gateway↔tools; bind envelope to TLS identity.

6) Receipts enrichment
- Add `constraints_fp`, `decision_id` to receipts; tee to Analytics for chain‑of‑custody and spend attribution.

### Bottom line
- Alignment: Strong alignment with OSO’s least‑privilege “effective permissions” model, authorization at the application/tool boundary, and keeping identity out of prompts.
- Differentiators: ARIA’s budgets and tamper‑evident receipts exceed OSO’s scope.
- Next steps: Ship signed context envelope + transaction tokens, RAG proxy, and toolside SDK to fully embody OSO’s guidance with stronger guarantees.