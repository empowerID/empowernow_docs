
---

# LDAP VDS — Implementation Spec v2 (incorporating protocol & paging fixes)

See also: [Virtualization Phase 2 — Data Shaping, Merging, and Projection](./virtualization_phase2.md) for merge rules, projection profiles, PDP attribute gating, and aggregator behavior.

## What changed since v1 (delta)

* **Framing**: robust per-connection BER reader using a growable buffer; handles partial/combined PDUs; catches `SubstrateUnderrunError`.
* **Unknown ops**: reply with **Unsolicited Notice of Disconnection** (OID `1.3.6.1.4.1.1466.20036`) and close; **don’t** send a BindResponse.
* **RFC 2696 semantics**: **bad/expired cookie → `unwillingToPerform (53)`** and include a **paged response control with empty cookie**.
* **Paging state**: cookie now carries a **stable composite cursor** (from the aggregator) + **global deterministic order** (e.g., `subject` asc). Offset-only removed.
* **Filter & attr allowlist**: **single source of truth in YAML**; translator reads it (no hardcoded `ALLOWED_ATTRS`).
* **Matching rules**: define and implement **caseIgnore** behavior for `uid/cn/mail` in equality/substring; explicit normalization rules documented.
* **Controls**: verify `criticality`; unknown **critical** control → `unavailableCriticalExtension (12)`.
* **Backpressure**: bounded async send-queue, `writer.drain()` with timeout, and graceful close on overflow.
* **TLS policy**: **LDAPS-only in v1** (StartTLS off) to avoid mid-stream state switches; minimum TLS version/ciphers set. SASL/EXTERNAL clarified (SAN precedence over CN).
* **Client IP**: trust boundary defined; support **PROXY protocol v2** (preferred) or explicit `X-Forwarded-For` when terminating upstream.
* **Cookie HMAC rotation**: cookie now carries a `kid`; verifier tries new+old secrets for a window.
* **Single-flight**: Redis **Lua** lock (TTL+jitter) to collapse stampedes; losers backoff/poll cache.
* **DN normalization**: RFC 4514 escaping + **canonical case** policy for RDN attributes to prevent duplicates across case variants.
* **uvloop**: optional; clean Windows fallback.

---

## 1) Repository (unchanged layout, noted deltas)

```
vds/
  server/
    listener.py          # LDAPS only (v1), PROXY v2 optional
    protocol.py          # PDU reader (buffered), dispatcher, backpressure
    encoder.py           # Bind/Search encoders + Unsolicited Notice
    controls.py          # RFC 2696 encode/decode (criticality checks)
    errors.py            # strict LDAP result mapping
    session.py           # tenant + subject, cert → subject mapping
  ldap/
    filter_ast.py
    filter_from_asn1.py  # reads YAML allowlist
    filter_to_query.py   # caseIgnore normalization rules
    dn.py                # RFC 4514 escaping + canonicalization
  dsl/
    mapping_loader.py    # YAML (objects/filters/limits)
    mapping_eval.py      # JSONPath + pure builtins (no templates)
  exec/
    search_executor.py   # cursor paging, cookie HMAC(kid), PDP allowlist
    directory_aggregator.py # merges provider pages with deterministic order
    group_resolver.py
    planner.py           # (optional) selectivity hints
  connectors/
    base.py              # Provider interface + cursor types
    ldap_provider.py     # RFC 2696 client, optional server-side sort
    rest_provider.py     # httpx client with provider token paging
    sql_provider.py      # keyset pagination (ORDER BY lower(subject), id)
  deps/
    redis_cache.py       # JSON, Lua single-flight
    pdp.py
    audit.py
    ratelimit.py
    breaker.py
  utils/
    paging_cookie.py     # HMAC(kid) sign/verify (dual keys)
    ids.py
    fips.py
  observability/
    metrics.py           # low-card labels
    tracing.py
tests/
  # add: paging-invalid-cookie, unsolicited-disconnect, proxy-v2, caseIgnore equality
```

---

## 2) Protocol: robust PDU framing, unknown ops, backpressure

### PDU reader (per-connection buffer)

```python
# server/protocol.py (excerpt)
from pyasn1.codec.ber import decoder, encoder
from pyasn1.error import SubstrateUnderrunError
from pyasn1_modules import rfc4511
from .encoder import unsolicited_notice

class LDAPConnection:
    def __init__(...):
        self._buf = bytearray()
        self._send_q = asyncio.Queue(maxsize=self.deps.cfg.server.max_send_queue_items)  # backpressure
        self._sender_task = asyncio.create_task(self._sender())

    async def _read_message(self):
        while True:
            if self._buf:
                try:
                    msg, rest = decoder.decode(bytes(self._buf), asn1Spec=rfc4511.LDAPMessage())
                    self._buf = bytearray(rest)
                    return msg
                except SubstrateUnderrunError:
                    pass
            chunk = await self.r.read(self.deps.cfg.server.read_chunk)
            if not chunk: return None
            self._buf.extend(chunk)

    async def _sender(self):
        try:
            while True:
                data = await self._send_q.get()
                self.w.write(data)
                await asyncio.wait_for(self.w.drain(), timeout=self.deps.cfg.server.drain_timeout_s)
        except asyncio.TimeoutError:
            await self._send(unsolicited_notice(2, "protocolError: drain timeout"))
            self.w.close()
        except (asyncio.CancelledError, ConnectionError):
            pass

    async def _send(self, ldap_msg):
        data = encoder.encode(ldap_msg)
        try:
            self._send_q.put_nowait(data)
        except asyncio.QueueFull:
            # On overflow, bypass queue to avoid recursion, write notice directly
            notice = encoder.encode(unsolicited_notice(2, "protocolError: send queue overflow"))
            self.w.write(notice)
            with contextlib.suppress(Exception):
                await asyncio.wait_for(self.w.drain(), timeout=self.deps.cfg.server.drain_timeout_s)
            self.w.close()
```

### Unknown ops → Notice of Disconnection

```python
# server/encoder.py (new util)
from pyasn1_modules import rfc4511

NOTICE_OID = '1.3.6.1.4.1.1466.20036'

def unsolicited_notice(result_code: int, diag: str) -> rfc4511.LDAPMessage:
    msg = rfc4511.LDAPMessage()
    msg['messageID'] = 0  # unsolicited
    ext = rfc4511.ExtendedResponse()
    ext['resultCode'] = result_code
    ext['diagnosticMessage'] = diag
    ext['responseName'] = rfc4511.LDAPOID(NOTICE_OID)
    msg['protocolOp'] = rfc4511.LDAPMessage_protocolOp().setComponentByName('extendedResp', ext)
    return msg
```

Usage on unknown op:

```python
await self._send(unsolicited_notice(2, "protocolError: unsupported operation"))
self.w.close()
```

---

## 3) Controls (RFC 2696) + invalid-cookie semantics

* Parse request controls, verify `criticality`.
* If **unknown critical** control → `unavailableCriticalExtension (12)` response.
* **Invalid/expired cookie → `unwillingToPerform (53)`** and include **paged response control with empty cookie**.

```python
# server/controls.py (excerpt)
from pyasn1.codec.ber import decoder
from pyasn1_modules.rfc2696 import PagedResultsRequestValue, PagedResultsResponseValue
def parse_paged_req(controls):
    size, cookie, critical = None, None, False
    if not controls: return size, cookie, critical
    for ctl in controls:
        if str(ctl['controlType']) == PAGED_OID:
            critical = bool(ctl.getComponentByName('criticality'))
            val = bytes(ctl['controlValue'])
            seq, _ = decoder.decode(val, asn1Spec=PagedResultsRequestValue())
            size = int(seq['size']); cookie = bytes(seq['cookie']) or None
        else:
            if bool(ctl.getComponentByName('criticality')):
                raise LdapError(12, "unavailableCriticalExtension")
    return size, cookie, critical
### AbandonRequest (RFC 4511 §4.11)

* Track `messageID → task` for in-flight ops. On Abandon, cancel the task and stop emitting entries. No response is sent for Abandon.

```

On invalid cookie:

```python
if cookie and not state:
    done = search_done(mid, 53, "invalid paging cookie", controls=[make_paged_resp(None)])
    await self._send(done); return
```

---

## 4) Paging state: aggregator + deterministic order

* **Aggregator** merges N provider streams with a global order:

  * **Total ordering key**: `subject.casefold()` asc, tiebreak on stable per-source id
  * **Composite cursor**: `{ subject_cf, source_offsets: { <sourceId>: { cookie|token|last_key } } }`
  * Connector contracts:
    - LDAP: RFC 2696 cookie (or keyset fallback)
    - REST: provider next-page token
    - SQL/ODBC: keyset (`last subject_cf`, `last id`)

* **Cookie contents** (signed, rotated):
  `{"kid":"2025-08","tenant":"t1","q":"<qhash>","cur":<composite_cursor>,"v":<mapping_version>}`

```python
# utils/paging_cookie.py (rotation)
KMS = KeyRing(primary=K_NEW, previous=K_OLD)

def sign_cookie(state):
    envelope = {"kid": KMS.primary.id, "state": state}
    body = json.dumps(envelope, separators=(',',':'), sort_keys=True).encode()
    mac = hmac.new(KMS.primary.key, body, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(mac + body)

def verify_cookie(cookie):
    try:
        blob = base64.urlsafe_b64decode(cookie)
        mac, body = blob[:32], blob[32:]
        env = json.loads(body)
        kid = env.get("kid"); state = env.get("state")
        for key in KMS.keys_for(kid):
            if hmac.compare_digest(mac, hmac.new(key, body, hashlib.sha256).digest()):
                return state
        return None
    except Exception:
        return None
```

---

## 5) Filter whitelist + matching rules (YAML-driven)

**YAML**

```yaml
filters:
  allow_attrs: ["uid","cn","mail","memberOf","objectClass"]
  matching:
    uid:  caseIgnore
    cn:   caseIgnore
    mail: caseIgnore  # (documented: full lowercasing)
```

**Translator applies normalization:**

```python
# ldap/filter_to_query.py (excerpt)
def norm(attr, value):
    match = cfg.matching.get(attr, "caseExact")
    return value.casefold() if match == "caseIgnore" else value

def ast_to_query(node, base_dn):
    if isinstance(node, Eq):
        return {"eq": {node.attr: norm(node.attr, node.value)}}
    if isinstance(node, Substr):
        pfx = node.prefix.casefold() if node.prefix else None
        anys = [s.casefold() for s in (node.any or [])]
        sfx = node.suffix.casefold() if node.suffix else None
        return {"substr": {"attr": node.attr, "initial": pfx, "any": anys, "final": sfx}}
    ...
```

Providers honor these semantics (translator enforces allowlist and normalization; per-provider translators map to native queries).

---

## 20) Real‑world operational requirements

### Answer
- 1) Hot load/cache: Yes.
  - L1 process cache + L2 Redis (JSON-only) with single-flight and negative caching are in the design.
  - We can pre-warm hot keys at startup and add “stale-while-revalidate” for read paths.
  - Config hot-reload: add a file-watcher (or SIGHUP) to reload `connectors.yaml`, System Types/Definitions, `mapping.yaml`, and `filters.yaml` without restart.

- 2) Backend outage (LDAP/AD down):
  - Reads: serve from Redis for the TTL window; aggregator continues with any remaining healthy connectors. Return consistent results using the composite cursor; log connector unavailability.
  - Binds (password verification): do not cache credentials. We should fail-safe (unavailable/busy) rather than accept cached binds. If you need continuity, route bind verification to another authoritative connector (e.g., secondary AD) via connectors config; otherwise, do not allow “offline” binds.

- 3) Schema transform/unification: Yes.
  - Use CRUD-style System Types/Definitions for connector actions; VDS `connectors.yaml` wires directories to systems.
  - Aggregator merges rows across sources using a canonical key (`subject.casefold`, stable id).
  - Mapping layer (`mapping.yaml`) renders LDAP entries (DN, objectClass, attribute projections).
  - If you need cross-source attribute precedence, add merge rules (either a `unify.yaml` or a `merge_rules` section in `connectors.yaml`) to coalesce attributes before mapping.

### Gaps to close (small)
- Add hot-reload watcher for config files.
- Implement “stale-while-revalidate” and explicit “stale OK” flags per directory/source.
- Add optional `merge_rules` config (source precedence, coalesce lists) if you need richer unification beyond mapping.
- For bind continuity, document an explicit active/standby source list in `connectors.yaml` (no offline cache for credentials).

Terminology
- We use “Connectors” in VDS to align with CRUD Service terminology (System Types/Definitions). The “Directory Aggregator” composes multiple connectors per directory to provide deterministic paging and a composite cursor.

---

## 21) Deduplication and attribute merge policy

Recommended default
- Deduplicate by logical subject (subject.casefold). Emit one LDAP entry per subject per directory.
- Merge attributes deterministically using a precedence list of systems.
- Scalar attributes: pick the first present value following the precedence order.
- Multi-value attributes (lists): merge unique while preserving a stable order (by precedence, then lexicographic/case-insensitive as needed).

Design notes
- Ordering key for paging remains `(subject.casefold, stable id)` for internal merge/scan; dedup is applied before projection.
- Keep merges deterministic: no “last writer wins” based on wall time; use explicit precedence.
- Expose metrics: count of merged attributes, source contribution, and dedup rate per page.

Example (connectors.yaml)
```yaml
directories:
  person:
    sources:
      - system: addomain_ad
        object_type: user
        action: search_users
        key_fields: {subject: sAMAccountName, id: objectGUID}
      - system: auth0_eid
        object_type: users
        action: list
        key_fields: {subject: email, id: user_id}
    merge_rules:
      precedence: [addomain_ad, auth0_eid]
      attributes:
        mail:
          pick: first_present
          sources: [addomain_ad.mail, auth0_eid.email]
        givenName:
          pick: first_present
          sources: [addomain_ad.givenName, auth0_eid.given_name]
        sn:
          pick: first_present
          sources: [addomain_ad.sn, auth0_eid.family_name]
        memberOf:
          merge_unique:
            sources: [addomain_ad.memberOf, auth0_eid.groups]
```

Implementation sketch
- Aggregator groups rows by `subject_cf`; for each group, applies `merge_rules` to build a canonical subject record; mapping then renders DN/objectClasses/attributes.
- If `merge_rules` is omitted, default precedence is the `sources` order; scalars use first_present, lists merge_unique.

---

## 22) Implementation alignment (v2.1)

This section reflects what is now implemented in code and tested.

- Cookie envelope (executor)
  - Envelope structure: `{ "kid": <key-id>, "state": { "cur": <composite-cursor>, "q": <filter-hash?>, "v": <mapping-version?> } }`
  - `q` is a SHA1 of the normalized backend-agnostic filter JSON; `v` is a small hash of the loaded mapping config (objects/filters/limits). Both are optional.
  - Cookies are HMAC-SHA256 signed, key-rotated via `kid`, and size-enforced by `max_cookie_bytes` (oversize → 53 with empty paged cookie control at the protocol boundary).

- Observability (metrics/tracing)
  - Counters/histograms implemented:
    - `ldap_search_total{result}`
    - `ldap_pages_total`
    - `ldap_search_latency_seconds`
    - `provider_calls_total{outcome}`
    - `provider_latency_seconds`
    - `aggregator_latency_seconds`
  - Tracing shim provides `span(name, **attrs)`; aggregator and providers wrap calls with spans. Aggregator spans also emit timing to the aggregator latency histogram.

- Mapping DSL (JSONPath + built-ins)
  - Built-ins implemented: `concat`, `groupsOf(subject)`, `membersAsDNs(groupId)`.
  - If `objects.<type>.attributes` is present in the mapping YAML, the evaluator uses it as the source of truth (JSONPath-driven); otherwise a sensible default mapping is used for `person` (uid, cn, mail, objectClass, dn).
  - Group/member resolvers are injected and safe by default; failures return empty lists.
  - DN policy: attribute type names normalized; RDN values preserve original case in output; equality should use the DN normalizer.

- Aggregator composite cursor
  - Composite cursor shape remains: `{ subject_cf, source_offsets: { <system>: <cursor> } }`.
  - Start-after semantics are applied using `subject_cf` to avoid duplicates across pages.
  - When a fetched page contains additional rows for a system that were not yet emitted (e.g., multiple entries for the same subject or churn between pages), the aggregator records a per-system "last consumed" key `{subject_cf, id}` as the next offset instead of blindly advancing to the provider's next token. This avoids duplicates and holes during churn.

- Tests
  - Property-based tests (optional) cover caseIgnore equality/substring building.
  - Hot-reload watcher (`ConfigReloader`) tested for change detection.
  - Composite cursor round-trip tested for no duplicates on churn.


## 6) DN canonicalization

* **RFC 4514** escaping (unchanged).
* **Do not lowercase DN values**. Normalize **attribute type names** internally for matching/order, but **preserve the original case of RDN values** in returned DNs and attributes. Use an internal normalized key (e.g., casefold+escape) for dedup/sort only.

---

## 7) Redis single-flight (Lua), JSON only

```python
# deps/redis_cache.py (excerpt)
# Acquire lock (SETNX), TTL ms in ARGV[2], token in ARGV[1]; returns 1 if owner
SF_ACQUIRE = """
if redis.call('SETNX', KEYS[1], ARGV[1]) == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[2])
  return 1
else
  return 0
end
"""

async def single_flight(self, key, ttl_s, fn):
    lock = f"{key}:lock"; token = str(uuid4())
    got = await self.r.eval(SF_ACQUIRE, 1, lock, token, int(ttl_s*1000))
    if got == 1:
        try:
            val = await fn()
            await self.set_json(key, val, ttl=self.cfg.default_ttl)
            return val
        finally:
            # release only if we own it
            await self.r.eval("if redis.call('GET', KEYS[1])==ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end", 1, lock, token)
    # loser: backoff+jitter and poll cache
    for _ in range(self.cfg.sf_max_wait_iters):
        await asyncio.sleep(random.uniform(0.01, 0.05))
        val = await self.get_json(key)
        if val is not None: return val
    # fallback: run anyway
    return await fn()
```

---

## 8) Backpressure & timeouts

* **Send queue** capped (`max_send_queue_items`).
* `drain()` **timeout**; on timeout → send unsolicited notice, close.
* **Per request** time budgets (search/bind) → cancel work if over budget and send `timeLimitExceeded (3)` or `busy (51)`.

---

## 9) TLS & client identity

* **LDAPS-only** for v1; StartTLS disabled (can be toggled later).
* TLS: `minimum_version=TLS1.2`, FIPS ciphers if required.
* SASL/EXTERNAL: map **SAN\:otherName/UPN → rfc822Name → CN** (in that order). Reject subject ambiguity.
* **Client IP** extraction:

  * If listener enabled `proxy_protocol=True`, parse **PROXY v2** TLVs for the original src IP.
  * Else, if behind L7 and you trust it, read `X-Forwarded-For` **only if** mTLS terminates there (documented trust boundary).
* For UPN extraction (`otherName/UPN`), use `cryptography` with `getpeercert(binary_form=True)`; stdlib `ssl` dicts may omit UPN.

---

## 9.1) RootDSE and base search

* Implement `base=""`, `scope=base` returning at minimum:
  - `supportedLDAPVersion: ["3"]`
  - `supportedControl: ["1.2.840.113556.1.4.319"]` (RFC 2696)
  - `namingContexts: [ "ou=people,dc=…", "ou=groups,dc=…" ]`
  - Optional: `vendorName`, `vendorVersion`

---

---

## 10) Connectors & PDP contracts (frozen)

### Connectors (per source)

* LDAP connector: RFC 2696 paging, optional server-side sort; returns rows + cookie
* REST connector: provider/API next token paging; returns rows + token
* SQL/ODBC connector: keyset paging (`ORDER BY lower(subject), id`); returns rows + last-key
* All connectors must honor normalized filter inputs (caseIgnore) and produce deterministic ordering keys: `(subject.casefold, id)`

### PDP

* `POST /v1/ldap/bind` → `{"allow":bool,"obligations":{...}}`
* `POST /v1/ldap/search` → `{"allow":bool,"allowed_attrs":["cn","mail",...],"obligations":{"max_size":1000,"redact":["..."]}}`
* **Default deny**; breaker → treat as **deny** (fail-closed).

---

## 11) Search executor (cursor paging, cookie rotation)

```python
# exec/search_executor.py (excerpt)
state = verify_cookie(cookie) if cookie else {"cur": None}
if cookie and not state:
    raise LdapError(53, "invalid paging cookie")

rows, next_cur = await self.aggregator.search(
    base_dn=base_dn,
    scope=scope,
    filter_ast=normalized_ast,
    page_size=page_size,
    cursor=state.get("cur")
)

entries = []
for subj in rows:
    dn = self.map_engine.user_dn(base_dn, rdn_attr, subj["subject"])
    attrs = self._project(self.map_engine.map_person(subj, person_cfg), req_attrs)
    if pdp_gate:
        allowed = await self.pdp.allowed_attributes(subj["subject"], set(req_attrs))
        attrs = {k: v for k, v in attrs.items() if k == "dn" or k in allowed}
    entries.append(attrs | {"dn": dn})

next_cookie = sign_cookie({"cur": next_cur}) if next_cur else None
```

---

## 12) Testing additions (must-haves)

* **Framing**: multiple PDUs in one TCP packet; fragmented BER; random chunking.
* **Controls**: invalid cookie → 53 + empty cookie control; unknown critical control → 12.
* **Filters**: property-based tests (Hypothesis) for caseIgnore equality/substring; escaped chars.
* **Paging**: churn (subject insert/delete mid-page) still yields no duplicates/holes; cursor monotonic.
* **Unsolicited notice**: unknown op triggers OID and close.
* **Backpressure**: flood client (slow consumer) triggers send-queue overflow path.
* **Proxy v2**: parse TLVs; fall back safely.
* **Windows**: run tests without uvloop.
* **DN normalization parity**: `member` values generated by mapping compare equal to `memberOf` via the DN normalizer.
* **RootDSE**: `base=""`, `scope=base` returns version and controls.
* **Abandon**: slow search then Abandon cancels by messageID; no DoneResponse for that op.
* **Cookie size**: composite cursor stays ≤ configured `max_cookie_bytes` or yields `53` + empty cookie.
* **Filter DoS**: AST depth/size caps, wildcard limits.

---

## 13) Metrics/tracing (cardinality-safe)

* Counters:

  * `ldap_bind_total{result}` (map to small set: success, invalidCreds, insufficient, unavailable, other)
  * `ldap_search_total{result}` (success, unwilling, insufficient, unavailable, timeLimit, other)
  * `ldap_rate_limit_hits_total`, `ldap_lockouts_total`, `ldap_pages_total`
* Histograms: `ldap_bind_latency_seconds`, `ldap_search_latency_seconds`, `aggregator_latency_seconds`, `provider_latency_seconds`, `pdp_latency_seconds`
* Gauges: `ldap_connections_active`
* Tracing attrs: `tenant`, `message_id`, `filter_hash`, `page_size`, `cursor_present`, **no raw DNs/subjects**.

---

## 14) Example: Unsolicited notice on overflow/unknown op

```python
# server/protocol.py (excerpt)
from .encoder import unsolicited_notice

async def _handle_unknown(self, msg_id: int, name: str):
    await self._send(unsolicited_notice(2, f"protocolError: unsupported {name}"))
    self.w.close()
```

---

## 15) Example: YAML-driven allowlist in translator

```python
# ldap/filter_from_asn1.py (excerpt)
class FilterTranslator:
    def __init__(self, cfg):
        self.allowed = set(cfg.filters.allow_attrs)
        self.matching = cfg.filters.matching or {}

    def _guard(self, attr):
        if attr not in self.allowed:
        raise LdapError(53, f"attribute {attr} not allowed")
```

---

## 16) Open questions (unchanged, now precise)

* StartTLS: still out for v1? (Recommend **yes**.)
* Membership guarantees stable **cursor** across concurrent writes? If not, we may need snapshot/isolation hints.
* PDP allow-list granularity: per-attr only, or per-attr+value patterns (e.g., domains)? (v1: per-attr.)
* Any attributes needing locale-aware matching beyond `caseIgnore`? (Default: no.)

---

## 17) Ready-to-build checklist

* [ ] Listener (LDAPS, PROXY v2, TLS policy) + Protocol (framing/backpressure).
* [ ] Controls (RFC 2696) + invalid-cookie path.
* [ ] Filter translator wired to YAML allowlist + matching rules.
* [ ] Search executor (cursor paging, cookie rotation, PDP allowlist).
* [ ] Mapping DSL (compiled JSONPath, pure builtins).
* [ ] Redis cache (JSON, Lua single-flight, negative cache).
* [ ] Group resolver (transitive, cached).
* [ ] Rate limit/lockout + CB wrappers.
* [ ] Observability + audit.
* [ ] Tests: framing/controls/paging/fuzz/perf.

---

If you want, I can spit out the **scaffold files + basic tests** next so the team can `poetry run pytest` and iterate on membership/PDP stubs immediately.

Short answer:

* **Replace it.** Make the v2 spec the new source of truth and add a short “delta/migration” appendix at the end so readers coming from v1 can see what changed (paging semantics, unsolicited disconnect, YAML-driven allowlist, etc.).

* **Yes, the TAK/IGA info nudges the VDS**—not the core protocol—but the mapping, bind, and caching profiles should be tailored for TAK. See the concrete tweaks below; I’d add them as an **Appendix: “TAK Profile”** in the design.

---

# What to do with the docs

1. **Promote v2 to the main design.**
2. Add two appendices:

   * **Appendix A – Delta from v1** (one page of bullets so no one has to diff):
     framing fix, bad cookie → 53 + empty cookie, YAML allowlist, caseIgnore matching, HMAC `kid`, unsolicited disconnect, LDAPS-only v1, backpressure, Redis single-flight.
   * **Appendix B – TAK Profile** (below).

---

# Appendix B — TAK Profile (what changes for our LDAP VDS)

These don’t alter the core engine; they’re **config + integration** choices that make TAK happy and let your IGA/PKI drive certs and groups.

## 1) Bind modes to support

* **SASL/EXTERNAL (client cert)**: keep it first-class.

  * Identity extraction order: **SAN otherName/UPN → SAN rfc822Name → CN** (reject ambiguity).
  * Map to canonical `subject` via membership; audit cert FP/issuer.
* **Simple bind**: still supported, but rate-limited/lockout; most TAK installs will prefer client-cert.

*No code changes to the engine—just ensure the SASL/EXTERNAL path is fully wired and audited.*

## 2) Attribute & filter profile (keep TAK queries fast)

Use a TAK-friendly allowlist and matching rules:

```yaml
# config/schema.yaml (excerpt)
filters:
  allow_attrs: ["uid","sAMAccountName","cn","mail","memberOf","objectClass"]
  matching:
    uid: caseIgnore
    sAMAccountName: caseIgnore
    cn: caseIgnore
    mail: caseIgnore

limits:
  sizeLimit: 1000
  timeLimitMs: 3000
  defaultPageSize: 500
```

Notes:

* TAK commonly looks up by `uid`/`sAMAccountName` and reads `memberOf`. Keep those indexed in your membership service and fast-path them in `ast_to_query`.
* Stick to `Eq`, `Present`, and prefix `Substr` for performance.

## 3) TAK object mappings (VDS virtualization)

Give TAK a flat, cached view of people and groups. Example DSL:

```yaml
objects:
  person:
    base_dn: "ou=people,dc=example,dc=com"
    objectClasses: ["inetOrgPerson","organizationalPerson","person","top"]
    rdn: "uid"
    attributes:
      uid: "$.subject"                 # canonical username
      sAMAccountName: "$.windows.sam"  # if present; else omit
      cn: { func: "concat", args: ["$.profile.given_name"," ", "$.profile.family_name"] }
      givenName: "$.profile.given_name"
      sn: "$.profile.family_name"
      mail: ["$.emails.primary","$.emails.work"]
      # map IGA roles/teams to TAK groups:
      memberOf: { func: "groupsOf", args: ["$.subject"] }

  group:
    base_dn: "ou=groups,dc=example,dc=com"
    objectClasses: ["groupOfNames","top"]
    rdn: "cn"
    attributes:
      cn: "$.name"
      description: "$.description"
      member: { func: "membersAsDNs", args: ["$.id"] }
```

*This uses the same DSL from v2: JSONPath + built-ins, no templates.*

## 4) Deterministic paging for large TAK reads

* Keep the v2 **cursor-based paging** and **subject\_asc** total ordering.
* Clients like TAK are fine with RFC 2696; our **stateless HMAC cookie** w/ `kid` rotation is exactly what we want.

## 5) Caching profile for TAK

* **L1 60s**, **L2 Redis 5–10 min** for per-subject attribute blobs (`attrs:{subject}`) and **1–2 min** for `groups:{subject}` (group churn is higher).
* Enable **negative cache** for missing users/groups (60s) to blunt brute-force probes.
* Keep **CDC-driven invalidation** (IGA/HR/PKI events):

  * user change → `DEL attrs:{subject}`
  * membership change → `DEL groups:{subject}`, `DEL attrs:{subject}`

*No engine code change; just TTLs and Kafka/Redis wiring.*

## 6) Certificate lifecycle signals (from IGA/PKI, not VDS)

* VDS doesn’t issue or revoke; it **exposes state** needed by TAK:

  * Add optional attributes: `certificateSerialNumber`, `certificateNotAfter`, `revoked` (boolean), or separate `takStatus` attribute.
  * Your mapping DSL can surface these from the PKI system for ops/forensics; PDP can redact if not needed.

## 7) DN & OU conventions for TAK

* If you embed organizational data in cert OUs, reflect it in the directory DNs for clarity:

  * Example RDN policy: `uid=<lowercased subject>`, base `ou=people,dc=...`.
  * Ensure **RFC 4514 escaping** and **lowercase canonicalization** for RDN values to avoid duplicate DNs across case variants.

## 8) TLS and CA hygiene (interop more than code)

* Stick with **LDAPS-only** in v1.
* If you enable SASL/EXTERNAL, configure the listener with your TAK-trusted CA chain; publish any CRL/OCSP endpoints as required by your PKI.
* None of this changes the LDAP engine; it’s deployment policy.

## 9) Observability that helps TAK ops

Add a TAK-focused dashboard slice:

* `ldap_search_total{client="tak"}` (derive via SNI or cert OU)
* p95 search latency, cache hit %, rate-limit hits
* membership/PDP latencies
* count of `memberOf` values per subject (sanity)
* pages per search (watch for inefficient queries)

## 10) Safe defaults for TAK

* Default **allowlist** as above, **pageSize=500**, **sizeLimit=1000**, **timeLimit=3s**.
* Disable persistent search / VLV / server-side sort in v1 (TAK doesn’t need them), return `12` if critical.

---

## Bottom line

* **Make v2 the main doc**; it’s the right core.
* The TAK/IGA info **doesn’t change the engine**, it **configures it**:

  * certify SASL/EXTERNAL path,
  * set TAK-friendly filter/attribute allowlist,
  * ship a **TAK mapping profile** (YAML),
  * tune cache TTLs/invalidations,
  * expose optional PKI metadata attributes.

If you want, I can drop a PR-ready **“TAK Profile”** YAML, the **membership search contract** stub with cursor paging, and the tests for the **bad-cookie → 53** behavior so you can merge and move on.


Replace it. Make the v2 spec your primary doc, and fold the latest nits in as **v2.1** so nobody has to diff across messages. Below is a clean “final cut” you can drop in, plus tiny code patches and a ready-to-scaffold checklist.

---

# LDAP VDS — Implementation Spec v2.1 (final)

## Protocol & Paging (locked)

* **Framing**: per-connection growable buffer; decode BER in a loop; guard with `max_pdu_bytes`; handle `SubstrateUnderrunError` **and** generic `PyAsn1Error`.
* **Unknown op**: send **Unsolicited Notice of Disconnection** (`1.3.6.1.4.1.1466.20036`) with `protocolError (2)` and close.
* **RFC 2696**:

  * Bad/expired cookie → **`unwillingToPerform (53)`** and include a **paged response control with empty cookie**.
  * **Global** `sizeLimit`/`timeLimit` (not per-page):

    * If the search hits `sizeLimit`, return `sizeLimitExceeded (4)` and **do not** include a continuation cookie.
    * If `timeLimit` elapses, return `timeLimitExceeded (3)` and **cancel** downstream calls; **no cookie**.
* **Backpressure**: bounded send queue, `drain()` timeout; on overflow/timeouts: unsolicited notice → close; cancel in-flight tasks.
* **TLS**: **LDAPS-only v1**; StartTLS off. If PROXY v2 is used, it must be **pre-TLS** (TLS passthrough LB); the listener consumes PROXY v2 before handshake.

## Filters & Matching (locked)

* **ASN.1-first** (rfc4511) → internal AST. Allowed attrs & rules **only from YAML**.
* Allowed ops: `Eq`, `Present`, `Substr` (prefix/any/final), `And`, `Or`, `Not`.
* Matching rules: `caseIgnore` for `uid/cn/mail/sAMAccountName`; equality and substring inputs are **normalized** via `casefold()` before translation.

## Paging State & Cookies (locked)

* Deterministic global order (`subject` casefold asc).
* Aggregator returns a **composite cursor** (per-source offsets/cookies); cookie is stateless and **HMAC-signed envelope that includes `kid`** (supports rotation).
* Enforce `max_cookie_bytes` (target ≤ 2 KiB). If exceeded, return `unwillingToPerform (53)` with empty cookie.

## Controls (locked)

* Parse/verify criticality. Unknown **critical** control → `unavailableCriticalExtension (12)`.
* Supported in v1: **RFC 2696** only.

## Caching (locked)

* L1 per-proc (60s). L2 Redis (JSON; no pickle). Lua single-flight + jitter.
* Keys:
  `vds:{tenant}:attrs:{subject}`, `vds:{tenant}:groups:{subject}`, `vds:{tenant}:subjects:{qhash}:{cursor|none}:{n}`
* CDC/Kafka invalidation: user change → `DEL attrs:{subject}`; membership change → `DEL groups:{subject}` and `attrs:{subject}`.

---

## Drop-in code patches (apply as-is)

### 1) Unsolicited notice (correct OID type)

```python
# vds/server/encoder.py
from pyasn1_modules import rfc4511

NOTICE_OID = '1.3.6.1.4.1.1466.20036'

def unsolicited_notice(result_code: int, diag: str) -> rfc4511.LDAPMessage:
    msg = rfc4511.LDAPMessage()
    msg['messageID'] = 0
    ext = rfc4511.ExtendedResponse()
    ext['resultCode'] = result_code
    ext['diagnosticMessage'] = diag
    ext['responseName'] = rfc4511.LDAPOID(NOTICE_OID)
    msg['protocolOp'] = rfc4511.LDAPMessage_protocolOp().setComponentByName(
        'extendedResp', ext
    )
    return msg
```

### 2) Reader hardening + cleanup

```python
# vds/server/protocol.py (excerpts)
from pyasn1.codec.ber import decoder, encoder
from pyasn1.error import SubstrateUnderrunError, PyAsn1Error
from pyasn1_modules import rfc4511
import contextlib

async def _read_message(self):
    while True:
        if self._buf:
            try:
                msg, rest = decoder.decode(bytes(self._buf), asn1Spec=rfc4511.LDAPMessage())
                self._buf = bytearray(rest)
                return msg
            except SubstrateUnderrunError:
                pass
            except PyAsn1Error:
                await self._send(unsolicited_notice(2, "protocolError: decode failure"))
                self.w.close()
                return None
        if len(self._buf) > self.deps.cfg.server.max_pdu_bytes:
            await self._send(unsolicited_notice(2, "protocolError: PDU too large"))
            self.w.close()
            return None
        chunk = await self.r.read(self.deps.cfg.server.read_chunk)
        if not chunk:
            return None
        self._buf.extend(chunk)

async def run(self):
    try:
        while True:
            msg = await self._read_message()
            if msg is None: break
            # dispatch...
    finally:
        self._sender_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self._sender_task
        self.w.close()
        with contextlib.suppress(Exception):
            await self.w.wait_closed()
```

### 3) Controls criticality & invalid cookie → 53 + empty cookie

```python
# vds/server/controls.py (excerpts)
def parse_paged_req(controls):
    size, cookie = None, None
    if not controls: return size, cookie
    for ctl in controls:
        oid = str(ctl['controlType'])
        critical = bool(ctl.getComponentByName('criticality'))  # defaults False
        if oid == PAGED_OID:
            val = bytes(ctl['controlValue'])
        seq, _ = decoder.decode(val, asn1Spec=PagedResultsRequestValue())
        size = int(seq['size']); cookie = bytes(seq['cookie']) or None
        elif critical:
            raise LdapError(12, "unavailableCriticalExtension")
        return size, cookie
```

Caller side:

```python
# when cookie is present but verify_cookie(...) returns None:
done = search_done(mid, 53, "invalid paging cookie", controls=[make_paged_resp(None)])
await self._send(done); return
```

### 4) Cookie HMAC over the full envelope (bind `kid`)

```python
# vds/utils/paging_cookie.py
def sign_cookie(state: dict) -> bytes:
    envelope = {"kid": KEYS.primary.id, "state": state}
    body = json.dumps(envelope, separators=(',',':'), sort_keys=True).encode()
    mac = hmac.new(KEYS.primary.key, body, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(mac + body)

def verify_cookie(cookie: bytes) -> dict | None:
    try:
        blob = base64.urlsafe_b64decode(cookie)
        mac, body = blob[:32], blob[32:]
        env = json.loads(body); kid = env.get("kid"); state = env.get("state")
        for key in KEYS.keys_for(kid):
            if hmac.compare_digest(mac, hmac.new(key, body, hashlib.sha256).digest()):
                return state
            return None
    except Exception:
        return None
```

---

## Spec clarifications (document these in the design)

* **Limits semantics**:

  * `sizeLimit` is **global across the search**, not per page. When exceeded, respond **`4`** and **no cookie**.
  * `timeLimit` is **global**; cancel backend work; respond **`3`**; **no cookie**.
* **Case rules**:

  * Sorting key: `subject.casefold()` ascending.
  * Equality/substring matching for `uid`, `cn`, `mail`, `sAMAccountName` uses case-insensitive normalization.
* **DN canonicalization**:

  * RDN attributes (`uid`, `cn`) are lowercased when building the DN (attributes themselves keep original case); escape per RFC 4514.

---

## Tests to add (before scaffolding)

* **Cookie integrity**: tamper `kid` with same MAC → reject.
* **Decode error**: malformed BER triggers unsolicited notice + close.
* **Oversized PDU**: exceeds `max_pdu_bytes` → notice + close.
* **Drain timeout**: force slow consumer; verify overflow metric + close.
* **Invalid cookie**: returns `53` with empty paged cookie control.
* **Limits**: global `sizeLimit`/`timeLimit` behavior (no continuation cookie).
* **PROXY v2**: header consumed pre-TLS; fallback disabled when TLS terminates upstream.
* **CaseIgnore**: property-based tests for equality/substring normalization.

---

## Ready-to-scaffold checklist

* [ ] Land patches above in `encoder.py`, `protocol.py`, `controls.py`, `paging_cookie.py`.
* [ ] Lock YAML `filters.allow_attrs` + `matching` and remove any hardcoded allowlists.
* [ ] Define provider contracts (LDAP/REST/SQL) with deterministic order & cursor/token.
* [ ] Implement `exec.search_executor` to **raise** `LdapError` (not return tuples) on invalid cookie/time/size violations; the protocol layer maps to result codes + controls.
* [ ] Add `max_pdu_bytes`, `read_chunk`, `drain_timeout_s`, `max_send_queue_items` to config; cover with tests.
* [ ] Add task cancellation hooks on disconnect/error (membership, PDP, groups).
* [ ] Wire Lua single-flight & negative caches with tests.
* [ ] Write the limits/controls test suite (above).

---

If you want, I can spit out a repo skeleton (files + minimal tests) with these exact behaviors wired so you can `poetry run pytest` and start stubbing membership/PDP immediately.

---

## 18) Connector extraction from CRUDService (inventory & plan)

Goal: reuse the battle‑tested connector logic while removing CRUDService‑specific dependencies and keeping VDS standalone. Keep the YAML schema (System Types/Definitions) identical for consistency.

What to bring (by connector)
- LDAP/AD
  - Keep: ldap3 client, LDAPS/StartTLS options, connection pooling, RFC 2696 paged search, optional server‑side sort, DN validation (`safe_dn` equivalent), retry/backoff (tenacity), timeouts, idempotent read paths.
  - Drop for VDS v1: write/modify flows (add/modify/delete, group membership updates, password reset), Kafka hooks, CRUD metrics wrappers.
  - Replace: FastAPI `HTTPException` → `ProviderError`; Vault/CredentialManager → `SecretsProvider` (env first, pluggable); TemplateRendererConfigurator → minimal jinja2.
- REST
  - Keep: httpx client with retries/backoff, path templating, header injection hook (auth builder), expected outcomes mapping.
  - Drop: FastAPI/CRUD wrappers, plugin loader coupling.
  - Replace: exceptions/metrics with VDS equivalents.
- SQL/ODBC
  - Keep: parameterized execution, keyset pagination (`ORDER BY lower(subject), id`), timeout handling.
  - Drop: CRUD‑specific mapping scaffolding beyond query execution.
  - Note: prefer SQLAlchemy core or pyodbc; strictly no string‑built SQL in VDS.

Neutral interfaces to implement in VDS
- `class Provider` with `async def search(filter_ast, base_dn, scope, page_size, cursor) -> (rows, next_cursor)`
- `class SecretsProvider` with `get(name) -> str | None` (env; vault/azure optional later)
- `class ConnectorError(ProviderError)` hierarchy for consistent error handling

Dependencies required in VDS (runtime)
- ldap3, httpx, jinja2, PyYAML, tenacity
- One of: SQLAlchemy + appropriate DB driver (e.g., pyodbc) if using SQL providers
- Optional: pydantic (only if we keep strict models; can be avoided)

What to exclude from CRUDService
- FastAPI types (`HTTPException`), VaultService/CredentialManager, TemplateRendererConfigurator, ExecutionContext coupling, Kafka producers, plugin registry specifics, CRUD‑specific metrics wrappers.

Vended code structure in VDS
- `vds/providers/connectors/`
  - `ldap.py`, `ad.py` (if you keep vendor differences), `rest.py`, `odbc.py`, `base.py`
  - `config_loader.py` (YAML + jinja2; env substitution), `secrets.py` (env‑first), `registry.py` (type→class map)
- All connectors use VDS metrics facade and raise VDS exceptions.

Testing focus after extraction
- LDAP: RFC 2696 page loop, server‑sort off/on (optional), DN validation, retry/backoff paths
- REST: token paging, retry/backoff, header injection
- SQL: keyset paging correctness and deterministic ordering

---

## 19) Config conventions: System Types and System Definitions

Use the same layout and schema as CRUDService, without a runtime dependency:
- `ServiceConfigs/connectors/system_types/*.yaml` (e.g., `AD.yaml`, `openldap.yaml`, `auth0.yaml`, `ODBC.yaml`)
- `ServiceConfigs/connectors/systems/*.yaml` (e.g., `addomain_ad.yaml`, `auth0_eid.yaml`, `hr_db.yaml`)

VDS wiring (`connectors.yaml`) points to System Definitions and the action to run:

```yaml
directories:
  person:
    sources:
      - system: addomain_ad
        object_type: user
        action: search_users
        key_fields: {subject: sAMAccountName, id: objectGUID}
      - system: auth0_eid
        object_type: users
        action: list
        key_fields: {subject: email, id: user_id}
  group:
    sources:
      - system: addomain_ad
        object_type: group
        action: search_groups
        key_fields: {subject: cn, id: objectGUID}
```

Notes
- Keep CRUD’s YAML semantics (object_types/commands, templated params). VDS supplies normalized filter parameters; providers translate to native queries.
- Place configs in a neutral path and validate them in CI; VDS reads them directly (no CRUD imports).

---

## 19.1) CRUDService Parity Plan (factory, credentials, templating)

We will mirror the mature CRUDService patterns where they add robustness and reduce reinvention, while keeping VDS standalone and LDAP-focused.

Adopt as-is (or minimalized):
- Provider factory via registry file (connectors.yaml)
  - Load `connector_registry` and map Type → module/class
  - Constructor introspection to pass optional kwargs when accepted (e.g., `system_name`, `credential_manager`, `auth_header_builder`, `vault_service`) and otherwise fall back to simplified config kwargs
- Templating
  - Use a lightweight Jinja2 renderer for connectors; consistent render context exposing `params`, `connection`, and `system.connection` so existing system-type templates render unchanged
- Credentials
  - Start with env/static `CredentialManager` (basic, bearer, api-key) and keep an interface point to plug a vault provider later; preserve precedence (request → vault → static) when vault is enabled
- Error envelope
  - Providers return structured errors with status_code and upstream diagnostic payload; executor maps to LDAP results or forwards detail as needed
- Observability
  - Wrap provider actions with latency metrics and tracing attributes (cardinality-safe)

Justified deviations (VDS-specific):
- Keep LDAP write operations (ADD/MOD/DEL) out of scope for v1; only search flows are needed by VDS
- No runtime dependency on CRUDService; we only replicate the necessary patterns and interfaces
- Simplify connectors surface to the VDS Provider interface; reuse system-types commands for REST/LDAP where available

Actionable backlog (tracked in repo TODOs):
- Add constructor introspection and DI in the provider registry
- Implement minimal `CredentialManager` (env/static) with future vault hook
- Add Jinja renderer + context enrichment in providers
- Extend REST provider with `perform_action` (templated endpoint/body/headers) and structured errors
- Deep-merge system types and system definitions (object_types/commands) with overrides
- Wire aggregator to resolve command definitions (object_type/action) and invoke providers accordingly
- Instrument providers with metrics/tracing; keep labels low-cardinality

Compatibility impact:
- Existing CRUD-style system types/definitions and connectors.yaml can be reused in VDS without authors learning a new schema. Optional vault and advanced flows can be enabled later without breaking changes.
