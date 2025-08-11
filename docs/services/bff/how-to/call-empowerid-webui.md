---
id: call-empowerid-webui
title: Call EmpowerID WebUI via BFF
sidebar_label: Call EmpowerID WebUI
tags: [service:bff, type:how-to, roles:developer]
---

Goal: call an EmpowerID WebUI API method through the BFF.

Discover methods
```bash
curl -s --cookie "_eid_sid=..." https://.../api/v1/empowerid/webui/types | jq .
curl -s --cookie "_eid_sid=..." https://.../api/v1/empowerid/webui/types/PersonView/methods | jq .
```

Call
```bash
curl -X POST https://.../api/v1/empowerid/webui \
  -H "Content-Type: application/json" \
  --cookie "_eid_sid=..." \
  -d '{"type_name":"PersonView","method_name":"GetByLogin","parameters":{"login":"ada"}}'
```

Notes
- Parameters and allowed `included_properties` come from `empowerid_endpoints.yaml`
- PDP context uses the configured `pdp_resource`/`pdp_action`

See also: `../reference/empowerid-direct`


