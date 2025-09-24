### Competitive analysis: AWS “data used in generative AI applications (part 1)” vs. ARIA Shield BFF

Below is a concise side‑by‑side on the core themes in the AWS post and where ARIA Shield (IdP + PDP + ARIA Gateway + BFF + Receipt Vault + Analytics) lands today.

| Topic | AWS guidance (Bedrock focus) | ARIA Shield v1 behavior | Gap / opportunity |
|---|---|---|---|
| Authorization locus | Don’t let LLM decide; enforce at app/data source | PDP decisions at PEPs; BFF/ARIA enforce constraints | Strong alignment |
| Secure side channel for identity | Session attributes to tools (not in prompt) | ARIA adds `X-Delegator-ID`/`X-Agent-ID`; injects `_aria.row_filter_sql` server‑side | Standardize a signed “context envelope” + mTLS/PoP to harden toolside trust |
| Confused deputy mitigation | Backend action must re‑authz using side channel | Pairwise identities; per‑tool PDP checks; egress pinning | Provide a toolside PEP SDK to verify signed context/transaction tokens |
| RAG data filtering | Enforce auth when querying vector DB; metadata filters | Data scope (`row_filter_sql`) exists; not RAG‑specific in docs | Add RAG connector/proxy that always applies row/tenant filters per PDP |
| LLM prompt injection impact | Guardrails help but are not auth; keep auth out of prompt | BFF “prompt_rules”, output truncation; auth outside prompt | Add outbound leak‑guard in BFF (flagged in `…mcpgw_v3.md`) |
| Principle of least agency (OWASP LLM06:2025) | Constrain tools; pass only allowed data | Plan JWS + step index; schema pins; param allowlists | Add per‑call single‑use “transaction tokens” verified by tools |
| Identity binding | Use trusted identity tokens in side channel | IdP can bind via DPoP (`cnf.jkt`); Gateway PoP deferred | Promote PoP verification at ARIA Gateway; require by default (dev override) |
| Network trust | Prefer mTLS/SPIFFE | Not enforced today; flagged as TODO | Enforce SPIFFE/mTLS gateway↔tool; include identity in receipts |
| Budget/spend governance | Not a focus in part 1 | Stream‑time hold/settle; PDP live budgets via Analytics (ai_budget1) | Strong differentiator for ARIA |
| Auditability | Not central here | Signed, hash‑chained receipts + policy snapshot | Strong differentiator for ARIA |
| Data governance/classification | Classify before use; limit data exposure | Taxonomy/category addendum; analytics attribution | Add first‑class “data labels” → PDP constraints + tool masks/column filters |

### Where ARIA matches or exceeds AWS guidance
- Authorization at the boundary: PDP decisions enforced by ARIA Gateway/BFF; never delegated to the LLM.
- Out‑of‑band identity/context: headers + server‑side data‑scope injection (not in prompts).
- Excessive agency controls: plan contracts, schema pins, param allowlists, egress allowlists.
- Budget governance and provable audit: stream‑time budget guarantees and tamper‑evident receipts.

### Valuable gaps to close (high‑impact)
1. Signed side‑channel context envelope
   - Add a compact JWS the gateway/BFF attaches to tool calls (e.g., `X-ARIA-Context`): { bound_user, agent_id, tenant, decision_id, data_scope, consent_tx_id?, ttl }.
   - Tools verify signature and TTL using ARIA Gateway JWKS; reject if missing/invalid.

2. Transaction tokens (single‑use)
   - Mint a short‑TTL, single‑use token per invocation (bound to agent, tool_id, params_hash, decision_id).
   - Tools and ARIA Gateway both verify; prevents replay and confused deputy.

3. mTLS/SPIFFE and PoP by default
   - Enforce SPIFFE‑like workload IDs between gateway↔tools; bind context envelope to TLS identity.
   - Flip PoP to required at ARIA Gateway (keep explicit dev override).

4. RAG authorization proxy
   - Provide a lightweight proxy/lib for vector DBs that always applies PDP‑derived filters (tenant/project/user), never trusting LLM‑generated filters.
   - Standard request shape: `X-ARIA-Context` → translate to metadata filters.

5. Toolside PEP SDK
   - Drop‑in verification for the context envelope + transaction token; helpers for column masking and consent checks.
   - Reference implementations for Python/Node; examples for Lambda/OpenAPI backends.

6. Outbound leak guard (BFF)
   - Stream‑time scanner with policy‑driven redaction/URL blocking (already listed in `…mcpgw_v3.md`).
   - Metrics and deny receipts on truncation.

7. Column‑level masks and field minimization
   - Elevate `column_mask` (already mentioned in membership doc) into PDP constraints and propagate enforcement to tools via the context envelope.

8. Formalize “session attributes” semantics
   - Document guaranteed separation from prompt/tool params, TTLs, and which attributes are mandatory per resource type (model/tool/RAG).

### Quick wins mapped to your docs
- In `mcp_gateway/docs/________newdesign10_mcpgw_v3.md`: implement the already‑flagged PoP‑default, private‑egress deny, leak guard, deny‑receipts, and constraints fingerprint.
- In `…newdesign10.md` and `…_pdp.md`: define the JWS “context envelope” claim schema and add `decision_id`/`policy_version` binding.
- In `…_membership.md`: expand `data-scope` to include `column_mask` examples; surface in PDP constraints and receipts’ policy snapshot.
- In `…_analytics.md`: store and expose constraints fingerprint and `decision_id` for chain‑of‑custody queries.
- In `…_ai_budget1.md`: no change—already a differentiator; just include budget snapshot in the envelope for tool awareness.
- New short doc: RAG proxy pattern and toolside SDK usage guide.

### Net assessment
- Strong strategic alignment with AWS guidance (auth at the boundary, out‑of‑band identity, confused‑deputy avoidance).
- ARIA adds differentiators AWS doesn’t emphasize here: hard budgets with stream‑time enforcement and provable, hash‑chained receipts.
- Closing the side‑channel standardization (signed context), transaction tokens, and mTLS/PoP defaults would fully meet and surpass the AWS model while reducing operational risk in tool/RAG integrations.

- Added a comparative view and prioritized gaps; next I can draft the JWS context envelope schema and a minimal toolside verifier if you want.