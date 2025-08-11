---
id: migration-guide-visual-designer
title: Migration Guide — YAML Workflows to Visual Workflow Designer
sidebar_label: Migration to Visual Designer
tags: [service:crud, type:how-to, visual-designer]
---

This guide helps you migrate existing YAML workflows to the Visual Workflow Designer.

## Table of Contents
1. [Overview](#overview)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Migration Strategies](#migration-strategies)
4. [Step-by-Step Migration](#step-by-step-migration)
5. [Common Patterns](#common-patterns)
6. [Validation and Testing](#validation-and-testing)
7. [Rollback Procedures](#rollback-procedures)

## Overview

The Visual Workflow Designer supports importing existing YAML workflows and provides tools to help you modernize and enhance them with visual editing capabilities.

### Benefits of Migration

- Visual representation of complex workflows
- Easier maintenance and updates
- Better documentation through visual flow
- Enhanced collaboration between technical and business users
- Reduced errors through visual validation

## Pre-Migration Checklist

Before starting migration, ensure you have:

- [ ] Backed up all existing workflows
- [ ] Documented current workflow dependencies
- [ ] Identified critical workflows for pilot migration
- [ ] Allocated time for testing migrated workflows
- [ ] Trained users on the Visual Designer
- [ ] Set up version control for workflows

## Migration Strategies

### Strategy 1: Direct Import (Recommended)

1. Import existing YAML directly
2. Visual Designer converts to visual format
3. Review and enhance in visual editor
4. Test thoroughly before deployment

### Strategy 2: Gradual Recreation

1. Analyze existing workflow logic
2. Recreate step-by-step in Visual Designer
3. Add improvements during recreation
4. Run old and new workflows in parallel
5. Switch over after validation

### Strategy 3: Hybrid Approach

1. Keep critical workflows in YAML
2. Create new workflows visually
3. Gradually migrate as needed
4. Maintain both formats during transition

## Step-by-Step Migration

### Step 1: Prepare Your YAML Workflow

```yaml
name: legacy_approval_workflow
version: 1.0.0
description: Legacy approval process

steps:
  fetch_request:
    type: command
    system: ServiceNow
    action: get_record
    params:
      table: sc_request
      sys_id: "{{request_id}}"
  
  check_amount:
    type: condition
    depends_on: [fetch_request]
    condition: "amount > 1000"
    branches:
      true: manager_approval
      false: auto_approve
```

### Step 2: Import into Visual Designer

1. Open Visual Designer
2. Click Import → From YAML
3. Paste or upload your YAML file
4. Click Import

### Step 3: Review Auto-Generated Visual

The system will create visual nodes for each step, connections from dependencies, and an automatic layout. Review node types, connections, and missing configs.

### Step 4: Enhance the Visual Workflow

1. Improve layout and alignment
2. Add descriptions and labels
3. Enhance logic: error handling, notifications, parallel branches

### Step 5: Validate the Migration

The system validates configuration, required parameters, and dependency graphs.

### Step 6: Test Thoroughly

1. Unit test nodes
2. Integration test workflow
3. Regression test vs original
4. Performance test

## Common Patterns

### Sequential

```yaml
steps:
  step1: { type: command, action: create_ticket }
  step2: { type: command, depends_on: [step1], action: send_email }
  step3: { type: command, depends_on: [step2], action: update_status }
```

Visual: `[Start] → [Create Ticket] → [Send Email] → [Update Status] → [End]`

### Conditional

```yaml
steps:
  evaluate:
    type: condition
    condition: "priority == 'high'"
    branches: { true: urgent_path, false: normal_path }
```

### Parallel

```yaml
steps:
  parallel_tasks:
    type: parallel
    branches:
      email: { type: command, action: send_email }
      log: { type: command, action: create_log }
```

## Validation and Testing

Automated validation checks syntax, logic, and system constraints.

### Testing Checklist

- Nodes configured
- Connections correct
- Variables mapped
- Error handling present
- Performance acceptable
- Output matches original

### Test Execution (API example)

```bash
POST /api/workflows/{id}/test
{ "test_data": { "request_id": "REQ0001234", "amount": 1500, "priority": "high" },
  "compare_with": "legacy_workflow_id" }
```

## Rollback Procedures

Immediate rollback: stop new executions, restore prior version, document issues, fix and retry.

API restore example:

```bash
PUT /api/workflows/{id}/restore
{ "version": "1.0.0" }
```

## Migration Best Practices

Do: start small, document changes, involve stakeholders, keep backups, use version control, test extensively.

Don’t: migrate everything at once, skip testing, ignore warnings, delete originals, or rush.

## CRUD Service Workflows — YAML → SQL Runbook

Concrete runbook to import YAMLs into `visual_workflow_definitions` via Docker Compose stack.

### Prerequisites

- Docker Desktop; compose file `CRUDService/docker-compose-authzen4.yml`
- YAMLs in `ServiceConfigs/CRUDService/config/workflows`
- DB migrations applied (alembic service)

### Commands (Windows PowerShell)

```powershell
cd C:\source\repos\CRUDService
docker-compose -f docker-compose-authzen4.yml up -d db; docker-compose -f docker-compose-authzen4.yml up -d alembic
docker-compose -f docker-compose-authzen4.yml run --rm crud-service python /app/src/scripts/migrate_workflows_to_db.py
docker-compose -f docker-compose-authzen4.yml exec db psql -U postgres -d workflow_db -c "SELECT COUNT(*) FROM visual_workflow_definitions;"
```

Troubleshooting: check `DATABASE_URL`, workflow directory mounts, DB health, file extensions.


