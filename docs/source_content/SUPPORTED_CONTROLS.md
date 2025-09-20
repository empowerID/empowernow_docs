## Supported Controls and Behaviors

- Paged Results (1.2.840.113556.1.4.319)
  - Request: size, cookie
  - Response: cookie (empty on invalid cookie)
  - Unknown/invalid cookie maps to 53 with empty cookie response
  - Cookie envelope is HMAC-signed with `kid` rotation and capped by `MAX_COOKIE_BYTES` (default 2048). Oversize → 53 + empty cookie.

- Server Side Sort (1.2.840.113556.1.4.473 / response 1.2.840.113556.1.4.474)
  - Request: attributeType, orderingRule?, reverseOrder?
  - Response attached on SearchResultDone
  - With paging, unwillingToPerform (53) returned and sort response attached

- Virtual List View (2.16.840.1.113730.3.4.9 / response .10)
  - Requires SSS; if critical and missing SSS, 53 returned and VLV response attached
  - byOffset: indexRangeError (61) when offset out of range
  - byValue: targetPosition set to first entry >= value, else contentCount+1

- ManageDsaIT (2.16.840.1.113730.3.4.2)
  - Suppresses referrals when present

- Persistent Search (2.16.840.1.113730.3.4.3)
  - Not supported; if critical, unavailableCriticalExtension (12)

- Unknown Critical Controls
  - Any unknown critical control → unavailableCriticalExtension (12)


