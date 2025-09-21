# What is SCIM?

System for Cross-domain Identity Management (SCIM) is an open standard for automating user and group provisioning between identity domains.

## Why it matters
- Standardizes create/read/update/delete of identities across systems
- Reduces custom connectors and one-off scripts

## How it works (high-level)
- REST/JSON schema for Users/Groups with standard endpoints
- IdPs/HR systems act as sources; apps act as targets

## Key terms
- /Users, /Groups, schemas, PATCH, filter ops

## Common pitfalls
- Attribute mapping drift; partial deprovisioning; custom extensions without documentation

## Next steps
- Membership service reference: `services/membership/reference/schema-and-endpoints.md`
