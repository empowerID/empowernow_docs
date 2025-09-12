# Membership Service

The Membership Service is the authoritative relationship graph (Neo4j) for user→agent delegations, capabilities, budgets/max_steps, tenant/data scope, and identity‑chaining eligibility. It provides a PIP surface used by the PDP and is consulted by the IdP when issuing passports.

Start here:

- Explanations: Executive overview and architecture → `./explanation/reviewers-guide`
- Reference: Graph schema and PIP endpoints → `./reference/schema-and-endpoints`
- How‑to: Trial setup and quick checks → `./how-to/trial-setup`
- Postman: Review collection → `./reference/postman/membership_review.postman_collection.json`

Related docs:

- PDP obligations and delegation provisioning → `/docs/services/pdp/backend/obligations-and-delegation`
- IdP PEP → PDP request shape → `/docs/services/idp/backend/pep-pdp-request`

Doc types in this section:

- Tutorials: end‑to‑end walkthroughs for first‑time setup
- How‑to guides: focused tasks (seed, run, query)
- Explanations: architecture and reasoning
- Reference: definitive details (schema, endpoints)


