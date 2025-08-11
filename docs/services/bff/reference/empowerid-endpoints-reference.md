---
title: empowerid_endpoints.yaml Reference
---

Purpose

Catalog for EmpowerID direct integration used by the BFF. This is the source of truth for which workflows and WebUI methods are exposed and how PDP context is constructed.

Location and loading

- File: `ServiceConfigs/BFF/config/empowerid_endpoints.yaml`
- Loaded by `settings.empowerid_config_path` (defaults to `config/empowerid_endpoints.yaml` in the BFF container)

Auth block

- `client_id`, `client_secret`, `token_url`, `api_key`, `scope`
- Used by the BFF to obtain a bearer token for EmpowerID calls (workflows). Keep secrets in env/secret mounts.

Workflows section

- Named entries with:
  - `description`: human-readable purpose
  - `pdp_resource`, `pdp_action`: sent to PDP for authorization
  - `input_parameters`: required/optional fields and shape
- Example:
  ```yaml
  workflows:
    PersonDelete:
      description: "Delete a person"
      pdp_resource: "empowerid"
      pdp_action: "delete_person"
      input_parameters:
        PersonID:
          required: true
  ```

WebUI endpoints section

- Types with methods containing:
  - `included_properties`: fields expected in responses
  - `parameters`: required/optional inputs
- Example:
  ```yaml
  webui_endpoints:
    PersonView:
      GetByLogin:
        description: "Get person information by login name"
        pdp_resource: "empowerid"
        pdp_action: "read_person"
        included_properties:
          - PersonID
          - FirstName
          - LastName
        parameters:
          login:
            required: true
  ```

Discovery endpoints (UI/testing)

- `GET /api/v1/empowerid/workflows`
- `GET /api/v1/empowerid/webui/types`
- `GET /api/v1/empowerid/webui/types/{type}/methods`

Change control

- Edit this file; validate via the discovery endpoints; promote with the config SOP.

See also: `./empowerid-direct`, `../how-to/run-empowerid-workflow`, `../how-to/call-empowerid-webui`, `./pdp-mapping`


