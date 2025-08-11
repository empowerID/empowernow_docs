---
title: QA — Troubleshooting Checklist
---

Symptoms → checks

- 401/403 after login:
  - Verify `TEST_USERNAME/TEST_PASSWORD`
  - Confirm session cookie is set after callback
  - Check PDP decision (403 means denied)

- DNS or name resolution errors:
  - Hosts file entries for `*.ocg.labs.empowernow.ai` present and point to 127.0.0.1

- Connection refused:
  - `docker-compose -f docker-compose-authzen4.yml ps`
  - Inspect BFF/Traefik logs

Useful commands

```bash
docker-compose -f docker-compose-authzen4.yml ps
docker-compose -f docker-compose-authzen4.yml logs -f bff_app
docker-compose -f docker-compose-authzen4.yml logs -f traefik
curl -v http://localhost:8000/health
```

When to use browser-based diagnostics

- Run `test_real_oauth_playwright.py` to capture screenshots and a JSON report when flows fail unpredictably.


