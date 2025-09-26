# FAQ — PDP (AuthZEN)

## How is AuthZEN different from OPA/ABAC?
AuthZEN defines a standard decision response with constraints, obligations, versions, and TTL. It focuses on runtime contract between PEP and PDP, not just policy syntax.

## Why conservative merge?
To prevent over‑grant: intersect allowlists and take minimums for quantitative limits across policy layers.

## What about latency?
PDP responses include TTL for cache; sidecar modes minimize hops. Typical p50 fits under single‑digit ms in warm paths.

## Can I replay a decision for audits?
Yes. Decisions include IDs, versions, and constraints suitable for receipt linking and replay.

## How do obligations differ from constraints?
Constraints shape behavior (limits/allowlists); obligations require actions (e.g., step‑up MFA, emit receipt).

## Does PDP support batch evaluations?
Yes, via `POST /access/v1/evaluations`.

## How does PIP (Membership) enrich decisions?
Adds data_scope, step_up, identity_chain eligibility, and capability checks.

## See also
- `/docs/services/pdp/index.md`
- `/docs/services/pdp/explanation/merge-model.md`
- `/docs/services/pdp/explanation/pip-membership.md`
