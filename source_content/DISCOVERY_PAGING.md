## Discovery and Paging

### RootDSE and Schema
- RootDSE (base="", scope=base) returns:
  - supportedLDAPVersion: ["3"]
  - supportedControl: includes paging, sort, VLV, ManageDsaIT (when available)
  - subschemaSubentry: "cn=subschema"
  - namingContexts: from registry or settings
- Fallbacks:
  - cn=subschema: minimal schema attributes
  - cn=config, cn=schema,cn=config: minimal entries and children

### Naming Contexts Glue Entries
- When a base-scope search targets a DN that exactly matches a configured namingContext, VDS emits a minimal glue entry with:
  - objectClass: ["top"]
  - RDN attribute and value (e.g., dc=example)

### Base DN Discovery Guidance
- Read RootDSE for namingContexts
- Probe a context using subtree search with sizeLimit=1, attributes=["objectClass"]
- Accept advertised namingContexts as valid even if base-scope read returns no attributes

### Paging
- Request control (RFC 2696): size, cookie
- Response control includes cookie; empty cookie on invalid cookie (result 53)
- Cookies are HMAC-signed envelopes with a rotating `kid` and are size-bounded by `MAX_COOKIE_BYTES` (default 2048). Oversized cookies map to invalid (result 53) and return an empty cookie in the response control.

### Sort and VLV
- Sort response is attached on SearchResultDone
- With paging + sort, unwillingToPerform (53) is returned with sort response
- VLV requires SSS; byOffset indexRangeError (61) for out-of-range, byValue sets targetPosition >= value
