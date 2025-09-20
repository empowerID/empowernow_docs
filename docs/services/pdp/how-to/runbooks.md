---
id: runbooks
title: PDP runbooks
description: Common operational runbooks for PDP.
---

- Validate health: check `/health` and `/metrics`
- Verify BFF → PDP mapping works: `/docs/services/bff/reference/pdp-mapping`
- Investigate 403s: review decision events and BFF logs; confirm BFF mapping and PDP policy
- Tune caches and failure policy: see `../reference/settings-flags.md#caching-and-performance` and `#evaluation-behavior`



