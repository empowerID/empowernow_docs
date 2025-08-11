---
title: CRUD Service — FAQ
---

## Why don't I see any workflows in Automation Studio (Visual Designer)?

Most often the database catalog is empty in the current environment. Visual Designer lists workflows from the CRUD Service database table `visual_workflow_definitions`.

Quick checks:

1) Confirm the stack is up with DB and migrations applied

```powershell
cd C:\source\repos\CRUDService
docker-compose -f docker-compose-authzen4.yml up -d db
docker-compose -f docker-compose-authzen4.yml up -d alembic
```

2) Import YAML workflows into the DB (one-time or whenever you add/update YAMLs)

```powershell
cd C:\source\repos\CRUDService
docker-compose -f docker-compose-authzen4.yml run --rm crud-service python /app/src/scripts/migrate_workflows_to_db.py
```

3) Verify rows exist

```powershell
docker-compose -f docker-compose-authzen4.yml exec db psql -U postgres -d workflow_db -c "SELECT COUNT(*) FROM visual_workflow_definitions;"
```

If the count is 0, run the migration script above and refresh Automation Studio.

Also verify:

- You are pointing Automation Studio to the correct environment (base URL) that has the populated DB
- CRUD Service API is healthy and reachable from the UI
- Your user/role has permission to list workflows (if RBAC is enabled)

For the full migration steps and troubleshooting, see the Migration Guide:

- [How‑to: Migration Guide — YAML Workflows to Visual Workflow Designer](../how-to/migration-guide-visual-designer)

## BFF fails at startup with DCR errors — what do I do?

Issue a fresh DCR Initial Access Token (IAT), add it to the BFF environment in compose, and restart the BFF. A ready‑to‑use Postman request is in the CRUD Service repo. Full steps:

- Follow: [How‑to: BFF startup — DCR IAT](../how-to/bff-startup-dcr-iat)


