---
id: fips-startup-guard
title: FIPS 140‑3 startup guard — how it works, develop locally, and go to production
sidebar_label: FIPS startup guard
---

## Overview

The BFF runs a FIPS 140‑3 compliance check at startup via `empowernow_common.fips.validator.FIPSValidator.ensure_compliance()`.

- If critical checks fail (for example, OpenSSL FIPS provider not enabled, Python `cryptography` backend not FIPS), the app fails closed by default.

## Develop locally (safe overrides)

Most developer machines and base images don’t enable the OpenSSL FIPS provider. For local/dev, you can allow startup with explicit overrides.

Add these under the `bff` service in `CRUDService/docker-compose-authzen4.yml`:

```yaml
# Dev-only: allow startup without system-wide FIPS by overriding validator
EMPOWERNOW_FIPS_MODE: "true"          #  signals FIPS semantics for logging/context
PYTHONHASHSEED: "random"              #  recommended entropy hygiene
CRYPTOGRAPHY_OPENSSL_NO_LEGACY: "1"   #  prevent legacy provider usage
EMPOWERNOW_FIPS_DISABLE: "true"       #  final guard: continue startup even if checks fail
```

Behavior with override:

- Logs warnings (e.g., "OpenSSL 3.0+ FIPS provider not enabled")
- Proceeds only because `EMPOWERNOW_FIPS_DISABLE` is set

## What you’ll see in logs

Dev override path examples:

- "OpenSSL 3.0+ FIPS provider not enabled"
- "FIPS environment configured: EMPOWERNOW_FIPS_MODE=1"
- "FIPS COMPLIANCE FAILURE … failed_checks: ['cryptography_backend']"
- "FIPS compliance not detected; continuing due to dev override …"

Proper FIPS runtime (prod):

- No critical failures; validator completes without raising

## Production enablement checklist

- Base image/runtime
  - Use a base OS image with OpenSSL 3.x FIPS provider installed
  - Ensure `openssl.cnf` loads the FIPS provider and sets default properties to `fips=yes` (system‑wide or container‑local)
- Python cryptography binding
  - Confirm the `cryptography` library links against that FIPS‑enabled OpenSSL
- Environment hygiene
  - Keep `PYTHONHASHSEED=random` and `CRYPTOGRAPHY_OPENSSL_NO_LEGACY=1`
- Remove dev overrides
  - Unset `EMPOWERNOW_FIPS_DISABLE` (and, if desired, `EMPOWERNOW_FIPS_MODE`) in prod
- Verify
  - Restart the BFF and confirm the validator passes with no critical failures

## Policy for training/QA

- `EMPOWERNOW_FIPS_DISABLE` is only for development and training environments
- Do not use this override in production; each environment should be validated in true FIPS mode at least once

## Quick troubleshooting

- Failure: `cryptography_backend=false`
  - Cause: Python `cryptography` not using an OpenSSL build with FIPS provider
  - Fix: Rebuild to link `cryptography` against FIPS‑enabled OpenSSL; remove the dev override
- Failure: `openssl_fips=false`
  - Cause: FIPS provider not loaded or default properties not set to `fips=yes`
  - Fix: Update `openssl.cnf`; verify with `openssl list -providers` inside the container
- Environment warnings
  - Ensure `PYTHONHASHSEED=random` and `CRYPTOGRAPHY_OPENSSL_NO_LEGACY=1`

## References

- Release notes: see “FIPS startup guard and development override” in `ms_bff_spike/ms_bff/docs/release_notes_bff_migration.md`
- Compose location: `CRUDService/docker-compose-authzen4.yml` under the `bff` service


