---
title: logging.yaml Reference
---

Defaults

- JSON console and rotating file handler (`./logs/ms_bff.log`)
- Root level INFO; application logger `ms_bff` at DEBUG
- Uvicorn/FastAPI at INFO; Kafka loggers at WARNING to reduce noise

Toggles via env

- `LOG_LEVEL`, `LOG_FORMAT`, `LOG_JSON_FORMAT`, `LOG_ENABLE_TRACING`


