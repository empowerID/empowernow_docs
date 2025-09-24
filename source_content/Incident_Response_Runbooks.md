# Incident Response Runbooks

## PAT Leak Response
- Revoke impacted PATs in IdP
- Search audit for last_used_by subject; rotate related tokens
- Communicate to affected users; monitor for continued attempts

## Vendor Outage
- Confirm upstream status; throttle traffic; communicate degradation
- Consider temporary model routing changes if available

## PDP Outage (LKG)
- BFF shifts to last-known-good for limited tuples
- Monitor cache usage; restore PDP and invalidate LKG when back

## Redis Failure
- Introspection cache degrades to local TTL; expect higher IdP load
- Restore Redis; verify cache hit ratios

## Postmortem
- Collect timelines, metrics, and fixes; file follow-up actions
