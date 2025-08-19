---
title: Automation, /execute workflows, and AI agents
description: How to invoke the Secrets API from automation, CRUD /execute workflows, graph flows, and AI agents
---

## Overview

The Secrets Platform is callable over HTTP. This page shows how to wire the Secrets API for use in automation, CRUD Service `/execute` workflows, graph workflows, and AI agents. It reuses the same Canonical URIs and PDP enforcement as described elsewhere in this section.

## Use from CRUD Service workflows (/execute)

- Workflows and automation that can make HTTP requests to the CRUD Service can call the Secrets API endpoints directly.
- PDP enforcement occurs in the PEP (VaultService/Secrets API) before any provider access.
- Enable or require auth on endpoints with deployment flags (see Security integration page):
  - `SECRETS_API_REQUIRE_AUTH` to require auth
  - `SECRETS_ENFORCE_SCOPES` to enforce OAuth scopes

## Secrets API connection descriptor (example)

The following connection maps common operations to the Secrets API. Adjust `base_url` and auth headers per environment.

```yaml
name: "secrets"
type: "secrets_api"

connection:
  base_url: "{{ 'CRUD_INTERNAL_BASE_URL' | ENV or 'http://127.0.0.1:8000' }}"
  auth_type: "none"
  default_content_type: "application/json"

object_types:
  secret:
    schema_mapping: "secrets_passthrough"
    commands:
      value:
        method: "GET"
        endpoint: "/api/secrets/value"
        required_params: ["uri"]
        params:
          uri: "{{ params.uri }}"
          version: "{{ params.version }}"
        skip_schema_transform: true
      create_or_update:
        method: "POST"
        endpoint: "/api/secrets"
        required_params: ["uri", "value"]
        headers:
          Authorization: "Bearer {{ 'INTERNAL_EXECUTION_TOKEN' | ENV or 'internal' }}"
        body:
          uri: "{{ params.uri }}"
          value: "{{ params.value }}"
        skip_schema_transform: true
      read:
        method: "GET"
        endpoint: "/api/secrets"
        required_params: ["uri"]
        params:
          uri: "{{ params.uri }}"
        skip_schema_transform: true
      delete:
        method: "DELETE"
        endpoint: "/api/secrets"
        required_params: ["uri"]
        headers:
          Authorization: "Bearer {{ 'INTERNAL_EXECUTION_TOKEN' | ENV or 'internal' }}"
        params:
          uri: "{{ params.uri }}"
          destroy: "false"
        skip_schema_transform: true
      destroy:
        method: "DELETE"
        endpoint: "/api/secrets"
        required_params: ["uri"]
        headers:
          Authorization: "Bearer {{ 'INTERNAL_EXECUTION_TOKEN' | ENV or 'internal' }}"
        params:
          uri: "{{ params.uri }}"
          destroy: "true"
        skip_schema_transform: true
      rotate:
        method: "POST"
        endpoint: "/api/secrets/rotate"
        required_params: ["uri", "value"]
        headers:
          Authorization: "Bearer {{ 'INTERNAL_EXECUTION_TOKEN' | ENV or 'internal' }}"
        body:
          uri: "{{ params.uri }}"
          value: "{{ params.value }}"
        skip_schema_transform: true
      bulk:
        method: "POST"
        endpoint: "/api/secrets/bulk"
        required_params: ["operations"]
        headers:
          Authorization: "Bearer {{ 'INTERNAL_EXECUTION_TOKEN' | ENV or 'internal' }}"
        body:
          operations: "{{ params.operations }}"
          continueOnError: "{{ params.continueOnError or true }}"
        skip_schema_transform: true
      copy:
        method: "POST"
        endpoint: "/api/secrets/copy"
        required_params: ["fromUri", "toUri"]
        headers:
          Authorization: "Bearer {{ 'INTERNAL_EXECUTION_TOKEN' | ENV or 'internal' }}"
        body:
          fromUri: "{{ params.fromUri }}"
          toUri: "{{ params.toUri }}"
          overwrite: "{{ params.overwrite or false }}"
        skip_schema_transform: true
      move:
        method: "POST"
        endpoint: "/api/secrets/move"
        required_params: ["fromUri", "toUri"]
        headers:
          Authorization: "Bearer {{ 'INTERNAL_EXECUTION_TOKEN' | ENV or 'internal' }}"
        body:
          fromUri: "{{ params.fromUri }}"
          toUri: "{{ params.toUri }}"
          overwrite: "{{ params.overwrite or false }}"
        skip_schema_transform: true
      undelete:
        method: "POST"
        endpoint: "/api/secrets/undelete"
        required_params: ["uri", "versions"]
        headers:
          Authorization: "Bearer {{ 'INTERNAL_EXECUTION_TOKEN' | ENV or 'internal' }}"
        body:
          uri: "{{ params.uri }}"
          versions: "{{ params.versions }}"
        skip_schema_transform: true
      destroy_versions:
        method: "POST"
        endpoint: "/api/secrets/destroy-versions"
        required_params: ["uri", "versions"]
        headers:
          Authorization: "Bearer {{ 'INTERNAL_EXECUTION_TOKEN' | ENV or 'internal' }}"
        body:
          uri: "{{ params.uri }}"
          versions: "{{ params.versions }}"
        skip_schema_transform: true

  catalog:
    schema_mapping: "secrets_passthrough"
    commands:
      metadata:
        method: "GET"
        endpoint: "/api/secrets/metadata"
        required_params: ["prefix"]
        params:
          prefix: "{{ params.prefix }}"
          offset: "{{ params.offset or 0 }}"
          limit: "{{ params.limit or 100 }}"
        skip_schema_transform: true
      metadata_detail:
        method: "GET"
        endpoint: "/api/secrets/metadata/detail"
        required_params: ["uri"]
        params:
          uri: "{{ params.uri }}"
        skip_schema_transform: true
      versions:
        method: "GET"
        endpoint: "/api/secrets/versions"
        required_params: ["uri"]
        params:
          uri: "{{ params.uri }}"
        skip_schema_transform: true
      keys:
        method: "GET"
        endpoint: "/api/secrets/keys"
        required_params: ["uri"]
        params:
          uri: "{{ params.uri }}"
        skip_schema_transform: true
      search:
        method: "GET"
        endpoint: "/api/secrets/search"
        required_params: ["q"]
        params:
          q: "{{ params.q }}"
          prefix: "{{ params.prefix }}"
          offset: "{{ params.offset or 0 }}"
          limit: "{{ params.limit or 100 }}"
        skip_schema_transform: true
```

Notes

- Use Canonical URIs in parameters and payloads (e.g., `openbao+kv2://secret/app#token`).
- When `SECRETS_API_REQUIRE_AUTH=true`, include appropriate Authorization headers per your deployment.
- For YAML provider, reads/writes apply to the dev file only and are guarded by environment flags.

## Graph workflows and AI agents

- Graph workflows and agents can call the same endpoints with Canonical URIs for read, rotate, and catalog operations.
- Prefer `/api/secrets/value` for provider‑backed reads (supports KVv2 version pin via `version=`).
- Use bulk operations for maintenance windows and catalog endpoints for discovery.

## Auditing and observability

- All operations emit Kafka events (see Auditing & logging page) with non‑leaky `resource_ref` when configured.
- Use correlation IDs and traces to stitch workflow steps end‑to‑end.


