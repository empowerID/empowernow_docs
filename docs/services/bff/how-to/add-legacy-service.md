---
id: add-legacy-service
title: Add a legacy service to the proxy
sidebar_label: Add legacy service
tags: [service:bff, type:how-to, roles:devops, roles:developer]
---

Goal: register a new legacy C# service behind `/api/v1/proxy/{service}`.

Steps
1) Edit `ServiceConfigs/BFF/config/legacy_services.yaml`
   - Add entry under `legacy_services:`
   ```yaml
   legacy_services:
     my-service: "https://myservice.example.com/api"
   ```
   - Optional per‑service timeout under `legacy_service_timeouts:`
2) Deploy config and restart BFF
3) Test:
```bash
curl -I --cookie "_eid_sid=..." https://.../api/v1/proxy/my-service/health
```

Tips
- Override URL per environment with `LEGACY_SERVICE_MY_SERVICE_URL`
- Watch `/api/v1/proxy/health` for CB/cache status

See also: `../reference/legacy-proxy`


