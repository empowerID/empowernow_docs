---
title: Protect Endpoints (dependencies and decorators)
---

Use the authorization helpers from `core/permissions.py`.

Dependencies (FastAPI style)

```python
from fastapi import APIRouter, Depends
from ms_bff.src.core.permissions import has_permission

router = APIRouter()

@router.get("/api/forms/{form_id}", dependencies=[Depends(has_permission(resource_type="form", action="read"))])
async def get_form(form_id: str):
    ...
```

Decorator (wrap a handler)

```python
from ms_bff.src.core.permissions import requires_auth

@requires_auth(resource_type="workflow", action="execute")
async def start_workflow(request: Request):
    ...
```

Automatic mapping

- If `resource_type`/`action` are omitted, the path mapper uses `pdp.yaml:endpoint_map` to resolve them from the URL and body.

Context

- The helper collects `roles`, `permissions`, selected headers/query/body, and a correlation ID. Subject IDs are normalized before sending to PDP.


