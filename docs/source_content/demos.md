## Demos (pick 1–2; ≤10 min total)

### Demo A — Receipt chain + Analytics

Goal: Show signed receipt, chain continuity, spend hot state.

Steps:
1) Ensure services up (redis, receipt-vault, analytics, bff/aria).
2) Seed budget (optional): `redis-cli SET budget:agent:svc-123:for:pairwise 10`
3) Call BFF once with a small prompt (stream=true).
4) Show Receipt Vault response (JWS, hash) and Redis chain head `receipt:last:{agent}`.
5) POST the JWS to Analytics `/api/v1/analytics/receipts:batch`.
6) GET `/api/v1/analytics/runtime/hot?tenant_id=acme` → observe `daily_spend_usd`.

CLI snippets (illustrative):
```bash
# 3) Create a chat (mock provider)
curl -sS http://localhost:8083/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hello"}],"stream":true}' | jq .

# 5) Ingest receipt (replace <JWS>)
curl -sS http://localhost:8090/api/v1/analytics/receipts:batch \
  -H "Content-Type: application/json" \
  -d '{"jwss":["<JWS>"],"source":"bff"}' | jq .

# 6) Hot spend
curl -sS "http://localhost:8090/api/v1/analytics/runtime/hot?tenant_id=acme" | jq .
```

Talking points:
- Receipt verifies (RS256), chain_ok tracked; spend derived from usage or pricing.

---

### Demo B — PDP budget denial (402)

Goal: Show policy-defined budget enforced via PDP using Analytics hot state.

Setup:
1) PUT a tight monthly limit for user scope in Analytics.
```bash
curl -sS -X PUT http://localhost:8090/api/v1/analytics/budgets/limit \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"acme","scope":"user","period":"monthly","limit_usd":0.05}' | jq .
```

2) Call BFF with a prompt large enough to exceed `remaining_cents`.
3) Observe HTTP 402 with `spend_snapshot` in body.

Talking points:
- PEP sends `estimated_cents`; PDP queries Analytics; deny pre-gate; PEP maps to 402.

---

### Optional — IdP consent pending → approval → mint

1) Call IdP token exchange with RAR that triggers consent.
2) Receive `authorization_pending` with `consent_handle`.
3) POST approver decision.
4) Retry token exchange with handle → get ARIA passport.

---

### Optional — Identity chaining (delegated)

1) Tool Registry entry `auth_mode: "oauth_chaining"` with audience/scope.
2) ARIA requests `identity-assertion` from IdP.
3) Exchange at SaaS AS; call RS with returned token (+DPoP if configured).
4) Receipt includes `identity_chain` snapshot.


