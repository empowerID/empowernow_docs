---
id: entra-graph-batch-examples
title: Microsoft Graph $batch examples (Azure connector)
description: How to invoke the Azure connector batch API using `graph.batch` with real request bodies and YAML command structure.
sidebar_label: Graph $batch examples
---

These examples demonstrate how to invoke the Azure connector's batch API using the `graph.batch` command added to Azure system YAMLs.

## Example: Get 2 users and 1 group in one request

Request body (passed as `params.requests`):

```json
{
  "requests": [
    { "id": "1", "method": "GET", "url": "/users?$top=1" },
    { "id": "2", "method": "GET", "url": "/users?$top=1&$skip=1" },
    { "id": "3", "method": "GET", "url": "/groups?$top=1" }
  ]
}
```

YAML command (already present):

```yaml
graph:
  schema_mapping: graph_misc
  commands:
    batch:
      endpoint: "/$batch"
      method: POST
      headers:
        Content-Type: "application/json"
      body:
        requests: "{{ params.requests | tojson }} asjsonobject"
```

### Notes

- Each `requests[].url` must be a relative path (no base_url).
- Prefer grouping homogeneous operations to increase cache hits.
- For large batches, consider splitting by 20–25 sub‑requests to respect Graph limits.


