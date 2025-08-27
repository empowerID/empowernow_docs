# Trial setup

Follow these steps to quickly evaluate the Membership Service.

## Seed Neo4j (minimal dataset)

- Run: python membership/scripts/seed_neo4j.py --uri bolt://localhost:7687 --user neo4j --password test
- Compose alternative: bolt://localhost:7688, password password123

## Verify seeds

- Run: membership/scripts/quick_check.py (prints counts and sample relations)

## Exercise PIP endpoints

- Use the Postman collection: `docs/services/membership/reference/postman/membership_review.postman_collection.json`
- Sample IDs: user:demo1, agent:svc-123:for:demo1

## Run focused tests

- PIP router unit/integration tests in membership/tests
- Identity search tests for routes/services
