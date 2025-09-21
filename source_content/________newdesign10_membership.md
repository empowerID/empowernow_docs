\n+## Compatibility with current codebase (mapping)
\n+Use these mappings so the design fits the existing code and deployment without breaking current routes.
\n+- Endpoints and prefixes
  - Keep using "/api/v1" for this service. Add a PIP surface under "/api/v1/pip/membership" rather than "/membership/v1":
    - GET /api/v1/pip/membership/capabilities?user_id={id}&agent_id={id}
    - GET /api/v1/pip/membership/delegations?user_id={id}&agent_id={id}&status=active
    - GET /api/v1/pip/membership/data-scope?subject_id={id}&resource_type={type}
    - GET /api/v1/pip/membership/step-up?subject_id={id}
    - GET /api/v1/pip/membership/chain-eligibility?user_id={id}&agent_id={id}&tool_id={id}
  - Existing helpers remain available (already present via legacy aliases):
    - GET /api/v1/delegations/verify
    - GET /api/v1/delegations/capabilities?user_id=...&agent_id=...
\n+- Service wiring and ports
  - Container: membership_app on port 8003 (Traefik host membership.ocg.labs.empowernow.ai).
  - Config mount: ServiceConfigs/membership/config (see settings.yaml).
  - Golden source: `CRUDService/docker-compose-authzen4.yml` for service names, ports, and mounts.
  - Redis: redis://shared_redis:6379/2
\n+- Neo4j configuration
  - Internal URI: bolt://membership_neo4j:7687 (host publishes 7688:7687).
  - Add any missing indices/constraints for :Tenant and optional :SaaSApp used by PIP endpoints.
\n+- PDP integration
  - Extend ServiceConfigs/pdp/plugins/pips/membership_service_pip.py to call the new "/api/v1/pip/membership/*" endpoints and map responses to constraints.
\n+- IdP integration
  - Keep IdP/src/services/membership_service_client.py behavior and base_url (http://membership:8003/api/v1). No changes needed for IdP flows.
\n+### PIP endpoint response shapes (to match PDP expectations)
\n+- capabilities → { "capabilities": ["mcp:tool:...", ...] }
- delegations → list of active edges with capabilities, expires_at, budget_usd, max_steps, constraints (string or object), identifiers
- data-scope → { "tenant_ids": [...], "row_filter_sql": "tenant_id IN ('...')", "column_mask": {} }
- step-up → { "mfa_required": bool, "level": "strong" | "phishing_resistant" | ... }
- chain-eligibility → [ { "audience": "...", "scopes": ["..."] } ]

Awesome — here’s your **drop‑in replacement** that folds the new **ARIA v1 design** together with the **Membership (Neo4j) service** and wires it into the IdP + PDP. You keep the same endpoints and request shapes; we’re only swapping internal plumbing and adding one new service.

---

## What changes (at a glance)

**Unchanged**

* Public endpoints:

  * IdP: `POST /oauth/aria/token`
  * PDP: `POST /access/v1/evaluation` (and `/access/v1/evaluations` if you already added batch)
  * ARIA Gateway: `POST /mcp/{tool_id}`
  * BFF, Tool Registry, Receipt Vault endpoints (as before)
* AuthZEN request/response shapes (PDP still returns decision + constraints/obligations under `context`).

**New / Updated**

* **Membership Service (FastAPI + Neo4j)**: authoritative graph for delegations, capabilities, data‑scope, step‑up hints, and identity‑chaining eligibility.
* **PDP uses a Membership PIP client** to compute parts of `constraints`:

  * `data_scope` (tenant\_ids + row\_filter\_sql)
  * `step_up`
  * `identity_chain` (allowed\_audiences/scopes)
  * Capability check for the agent (user+agent pair)
* **IdP consults Membership** during token exchange to:

  * Verify there’s an **active delegation** (user → agent)
  * Pull **budget** and **max\_steps** to embed in `aria` passport claims

Everything else remains as in your last ARIA v1 cut.

---

## Repo layout (additions highlighted)

```
repo/
├─ idp/
│  └─ main.py                      # UPDATED: calls membership for delegation/budget
├─ pdp/
│  ├─ main.py                      # UPDATED: calls membership PIP for constraints/caps
│  └─ pip/
│     ├─ membership_client.py      # NEW: PIP client (httpx)
├─ aria/
│  └─ ...                          # unchanged
├─ tool_registry/
│  └─ ...                          # unchanged
├─ bff/
│  └─ ...                          # unchanged
├─ receipt_vault/
│  └─ ...                          # unchanged
├─ membership/                     # NEW SERVICE
│  ├─ main.py
│  └─ requirements.txt
├─ docker-compose.yml              # UPDATED: adds neo4j + membership, wires env vars
└─ tests/
   └─ (optional) ...
```

---

## 1) Membership Service (NEW)

**`membership/main.py`**

```python
# membership/main.py
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
from neo4j import GraphDatabase

app = FastAPI(title="ARIA Membership Service")

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "test")

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

# ---------- Models

class DelegationOut(BaseModel):
    delegation_id: str
    status: str
    max_steps: Optional[int] = None
    budget_usd: Optional[float] = None
    expires_at: Optional[str] = None

class CapabilitiesOut(BaseModel):
    capabilities: List[str]

class DataScopeOut(BaseModel):
    tenant_ids: List[str]
    row_filter_sql: str
    column_mask: Dict[str, Any] = {}

class StepUpOut(BaseModel):
    mfa_required: bool
    level: Optional[str] = None

class ChainEligibilityItem(BaseModel):
    audience: str
    scopes: List[str]

# ---------- Helpers

def run(query: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
    with driver.session() as session:
        res = session.run(query, **params)
        return [r.data() for r in res]

# ---------- Endpoints (read-only PIP surface)

@app.get("/membership/v1/capabilities", response_model=CapabilitiesOut)
def get_capabilities(user_id: str = Query(...), agent_id: str = Query(...)):
    rows = run("""
        MATCH (u:User {id:$user_id})-[:DELEGATES_TO]->(d:Delegation {status:'active'})-[:BINDS]->(a:Agent {id:$agent_id})
        MATCH (d)-[:HAS_CAPABILITY]->(c:Capability)
        RETURN collect(DISTINCT c.id) AS capabilities
    """, {"user_id": user_id, "agent_id": agent_id})
    caps = rows[0]["capabilities"] if rows else []
    return {"capabilities": caps}

@app.get("/membership/v1/delegations", response_model=List[DelegationOut])
def list_delegations(user_id: str, agent_id: str, status: Optional[str] = None):
    rows = run("""
        MATCH (u:User {id:$user_id})-[:DELEGATES_TO]->(d:Delegation)-[:BINDS]->(a:Agent {id:$agent_id})
        WHERE $status IS NULL OR d.status = $status
        RETURN d.id AS delegation_id, d.status AS status, d.max_steps AS max_steps,
               d.budget_usd AS budget_usd, d.expires_at AS expires_at
    """, {"user_id": user_id, "agent_id": agent_id, "status": status})
    return rows

@app.get("/membership/v1/data-scope", response_model=DataScopeOut)
def data_scope(subject_id: str, resource_type: str):
    # Tenants from direct + via projects
    trows = run("""
        MATCH (u:User {id:$sid})-[:BELONGS_TO]->(t:Tenant)
        OPTIONAL MATCH (u)-[:ASSIGNED_TO]->(:Project)-[:OWNED_BY]->(tp:Tenant)
        WITH collect(DISTINCT t.id) + collect(DISTINCT tp.id) AS tids
        RETURN [x IN tids WHERE x IS NOT NULL] AS tenant_ids
    """, {"sid": subject_id})
    tenant_ids = trows[0]["tenant_ids"] if trows else []
    # Conservative row filter (SQL-ish)
    if tenant_ids:
        quoted = "', '".join(tenant_ids)
        row_filter_sql = f"tenant_id IN ('{quoted}')"
    else:
        row_filter_sql = "1=0"  # no access
    return {"tenant_ids": tenant_ids, "row_filter_sql": row_filter_sql, "column_mask": {}}

@app.get("/membership/v1/step-up", response_model=StepUpOut)
def step_up(subject_id: str):
    rows = run("""
        MATCH (u:User {id:$sid})
        RETURN CASE
            WHEN u.mfa_level IS NULL OR u.mfa_level = 'none' THEN {mfa_required:true, level:'strong'}
            WHEN u.mfa_level = 'strong' THEN {mfa_required:false, level:'strong'}
            WHEN u.mfa_level = 'phishing_resistant' THEN {mfa_required:false, level:'phishing_resistant'}
            ELSE {mfa_required:true, level:'strong'}
        END AS step
    """, {"sid": subject_id})
    return rows[0]["step"] if rows else {"mfa_required": True, "level": "strong"}

@app.get("/membership/v1/chain-eligibility", response_model=List[ChainEligibilityItem])
def chain_eligibility(user_id: str, agent_id: str, tool_id: str):
    rows = run("""
        MATCH (u:User {id:$uid})-[:DELEGATES_TO]->(ag:Delegation {status:'active'})-[:BINDS]->(a:Agent {id:$aid})
        MATCH (tool:Tool {id:$tool})<-[:CAN_INVOKE]-(a)
        MATCH (tool)-[r:REQUIRES]->(app:SaaSApp)
        RETURN app.id AS audience, r.scopes AS scopes
    """, {"uid": user_id, "aid": agent_id, "tool": tool_id})
    return rows
```

**`membership/requirements.txt`**

```
fastapi==0.110.*
uvicorn[standard]==0.30.*
neo4j==5.*
```

> Run: `uvicorn main:app --host 0.0.0.0 --port 8085`

---

## 2) PDP → Membership PIP (NEW) and PDP update

**`pdp/pip/membership_client.py`**

```python
# pdp/pip/membership_client.py
import httpx
from typing import Dict, Any, List

class MembershipPIP:
    def __init__(self, base_url: str, timeout: float = 0.8):
        self._c = httpx.AsyncClient(base_url=base_url.rstrip("/"), timeout=timeout)

    async def capabilities(self, user_id: str, agent_id: str) -> List[str]:
        r = await self._c.get("/membership/v1/capabilities", params={"user_id": user_id, "agent_id": agent_id})
        r.raise_for_status(); return r.json().get("capabilities", [])

    async def delegations(self, user_id: str, agent_id: str, status: str = "active") -> List[Dict[str, Any]]:
        r = await self._c.get("/membership/v1/delegations", params={"user_id": user_id, "agent_id": agent_id, "status": status})
        r.raise_for_status(); return r.json()

    async def data_scope(self, subject_id: str, resource_type: str) -> Dict[str, Any]:
        r = await self._c.get("/membership/v1/data-scope", params={"subject_id": subject_id, "resource_type": resource_type})
        r.raise_for_status(); return r.json()

    async def step_up(self, subject_id: str) -> Dict[str, Any]:
        r = await self._c.get("/membership/v1/step-up", params={"subject_id": subject_id})
        r.raise_for_status(); return r.json()

    async def chain_eligibility(self, user_id: str, agent_id: str, tool_id: str) -> List[Dict[str, Any]]:
        r = await self._c.get("/membership/v1/chain-eligibility", params={"user_id": user_id, "agent_id": agent_id, "tool_id": tool_id})
        r.raise_for_status(); return r.json()
```

**`pdp/main.py` (UPDATED)**

```python
# pdp/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import os, uuid

from pip.membership_client import MembershipPIP

app = FastAPI(title="AuthZEN PDP (ARIA + Membership)")

MEMBERSHIP_URL = os.getenv("MEMBERSHIP_URL", "http://membership:8085")
CHAIN_MAX_TTL = int(os.getenv("CHAIN_MAX_TTL", "300"))

# ---- Request models (unchanged)
class Subject(BaseModel):
    type: str
    id: str
    properties: Dict[str, Any] = {}

class Action(BaseModel):
    name: str

class Resource(BaseModel):
    type: str
    id: Optional[str] = None
    properties: Dict[str, Any] = {}

class EvaluationRequest(BaseModel):
    subject: Subject
    action: Action
    resource: Resource
    context: Dict[str, Any] | None = None

# ---- PIP client
pip = MembershipPIP(MEMBERSHIP_URL)

# ---- Baseline limits (policy knobs; can also be authored in DSL and merged)
MODEL_ALLOW = os.getenv("MODEL_ALLOW", "gpt-4.1,gpt-4o-mini").split(",")
EGRESS_ALLOW = os.getenv("EGRESS_ALLOW", "api.openai.com:443,tools.example.com:443").split(",")

def base_constraints() -> Dict[str, Any]:
    return {
        "model": {"allow": [m for m in MODEL_ALLOW if m]},
        "tokens": {"max_input": 8192, "max_output": 2048, "max_stream": 4096},
        "egress": {"allow": [h for h in EGRESS_ALLOW if h]},
        "prompt_rules": {
            "disallowed_phrases": ["ignore all previous", "system override"],
            "url_allowlist": ["*.corp.example"],
            "block_markdown_external_links": True,
            "block_system_prompt_leakage": True
        },
        "params": {"allowlist": {}},
        "spend": {}
    }

@app.post("/access/v1/evaluation")
async def evaluation(req: EvaluationRequest):
    # 1) shape/validate
    if req.subject.type != "agent":
        raise HTTPException(400, "subject.type must be 'agent'")

    agent_id = req.subject.id
    bound_user = (req.subject.properties or {}).get("bound_user") or (req.context or {}).get("bound_user")
    if not bound_user:
        # For ARIA, we require pairwise binding; fail closed without a bound user id
        return {"decision": False, "context": {}, "reason": "missing_bound_user"}

    # 2) Capability check from Membership (user+agent → capabilities[])
    requested_capability = (req.context or {}).get("capability", req.action.name)
    caps = await pip.capabilities(bound_user, agent_id)
    if requested_capability not in set(caps):
        return {"decision": False, "context": {}, "reason": "capability_not_granted"}

    # 3) Build constraints (policy ∧ membership)
    constraints = base_constraints()

    # data_scope
    ds = await pip.data_scope(bound_user, req.resource.type)
    constraints["data_scope"] = ds

    # step_up
    step = await pip.step_up(bound_user)
    constraints["step_up"] = step

    # identity_chain (when resource is a tool and we have eligibility)
    if req.resource.type in ("tool", "mcp:tool") and req.resource.id:
        elig = await pip.chain_eligibility(bound_user, agent_id, req.resource.id)
        if elig:
            audiences = sorted({e["audience"] for e in elig if e.get("audience")})
            scopes = sorted({s for e in elig for s in (e.get("scopes") or [])})
            constraints["identity_chain"] = {
                "allowed_audiences": audiences,
                "allowed_scopes": scopes,
                "max_token_ttl_seconds": CHAIN_MAX_TTL,
                "claim_allowlist": ["sub","email","groups","act.sub"],
                "require_dpop": False,
                "require_mtls": False
            }

    obligations = [
        {"id": "emit_receipt"},
        {"id": "tee_analytics", "attributes": {"include": ["usage", "limits", "data_scope"]}}
    ]

    return {
        "decision": True,
        "context": {
            "constraints": constraints,
            "obligations": obligations,
            "decision_id": str(uuid.uuid4()),
            "policy_version": os.getenv("POLICY_VERSION","2025-08-10.3"),
            "constraints_schema": "aria.constraints.v1",
            "ttl_ms": 1500
        }
    }
```

> If you already have the richer PDP with catalogs/merging, keep it; just **replace** your constraint sources for `data_scope`, `step_up`, and `identity_chain` with calls to `MembershipPIP` exactly as above.

---

## 3) IdP → Membership (UPDATED)

**`idp/main.py` (replace the stubbed delegation lookup)**

```python
# idp/main.py (only the changes shown; keep the rest of your file as-is)
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os, time, json, uuid, hashlib, jwt, httpx

app = FastAPI(title="IdP (ARIA extension)")

PRIVATE_KEY = os.environ.get("IDP_PRIVATE_KEY_PEM", None)
if not PRIVATE_KEY:
    raise RuntimeError("IDP_PRIVATE_KEY_PEM must be set")

PAIRWISE_SALT = os.environ.get("ARIA_PAIRWISE_SALT", "dev-salt")
ISSUER = os.environ.get("ARIA_ISSUER", "https://idp.example.com")
MEMBERSHIP_URL = os.getenv("MEMBERSHIP_URL", "http://membership:8085")
TOOL_REGISTRY_URL = os.getenv("TOOL_REGISTRY_URL", "http://tool-registry:8081")

http = httpx.AsyncClient(timeout=1.5)

class ExchangeRequest(BaseModel):
    subject_token: str
    actor_token: str
    requested_tools: list[str]
    plan: dict | None = None
    tenant: str = "default"

async def get_active_delegations(user_id: str, agent_id: str):
    r = await http.get(f"{MEMBERSHIP_URL.rstrip('/')}/membership/v1/delegations",
                       params={"user_id": user_id, "agent_id": agent_id, "status": "active"})
    r.raise_for_status()
    return r.json()

async def get_capabilities(user_id: str, agent_id: str):
    r = await http.get(f"{MEMBERSHIP_URL.rstrip('/')}/membership/v1/capabilities",
                       params={"user_id": user_id, "agent_id": agent_id})
    r.raise_for_status()
    return r.json().get("capabilities", [])

async def get_tool_pin(tool_id: str) -> dict:
    r = await http.get(f"{TOOL_REGISTRY_URL.rstrip('/')}/tools/{tool_id}")
    r.raise_for_status()
    meta = r.json()
    return {"schema_version": meta["schema_version"], "schema_hash": meta["schema_hash"]}

def pairwise(user_id: str, service_id: str) -> str:
    raw = f"pairwise:v1:{user_id}:{service_id}:{PAIRWISE_SALT}".encode()
    return "pairwise:" + hashlib.sha256(raw).hexdigest()[:16]

def sign_jwt(payload: dict) -> str:
    return jwt.encode(payload, PRIVATE_KEY, algorithm="RS256",
                      headers={"alg":"RS256","kid":"idp-aria-001","typ":"JWT"})

def canonical_hash(obj: dict) -> str:
    import json, hashlib
    return "sha256:" + hashlib.sha256(json.dumps(obj, sort_keys=True).encode()).hexdigest()

def sign_plan_contract(plan: dict, agent_id: str) -> str:
    steps = []; total = 0.0
    for i, s in enumerate(plan.get("steps", [])):
        pf = canonical_hash(s.get("params", {}))
        cost = float(s.get("cost", 0))
        total += cost
        steps.append({"index": i, "tool": s["tool"], "params_fingerprint": pf, "max_cost": cost})
    payload = {
        "plan_id": hashlib.sha256(json.dumps(plan, sort_keys=True).encode()).hexdigest()[:16],
        "agent_id": agent_id,
        "total_budget": round(total, 2),
        "steps": steps,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "expires_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time()+3600)),
    }
    return sign_jwt(payload)

@app.post("/oauth/aria/token")
async def aria_token_exchange(req: ExchangeRequest):
    # In production, verify subject/actor tokens cryptographically and derive real user/service ids.
    user_id = "user:123"
    service_id = "svc-123"

    pw = pairwise(user_id, service_id)
    agent_id = f"agent:{service_id}:for:{pw.split(':')[1]}"

    # 1) Must have at least one active delegation
    delegs = await get_active_delegations(user_id, agent_id)
    active = [d for d in delegs if d.get("status") == "active"]
    if not active:
        raise HTTPException(403, "consent_required")

    # Aggregate budget (sum) and steps (min) across active delegations
    total_budget = sum(float(d.get("budget_usd") or 0.0) for d in active)
    max_steps = min([int(d.get("max_steps") or 20) for d in active]) if active else 20

    # 2) Build schema pins from registry
    schema_pins = {}
    for t in req.requested_tools:
        schema_pins[t] = await get_tool_pin(t)

    # 3) Optional plan → signed plan contract
    plan_jws = sign_plan_contract(req.plan, agent_id) if req.plan else None

    now = int(time.time())
    passport = {
        "iss": ISSUER,
        "sub": pw,
        "aud": "aria.gateway",
        "iat": now,
        "exp": now + 3600,
        "jti": str(uuid.uuid4()),
        "act": {"sub": agent_id},
        "authorization_details": [{
            "type": "agent_delegation",
            "tools": req.requested_tools,
            "locations": []
        }],
        "aria": {
            "bound_sub": pw,
            "tenant": req.tenant,
            "schema_pins": schema_pins,
            "call_id": str(uuid.uuid4()),
            "max_steps": max_steps,
            "plan_contract_jws": plan_jws,
            "budget": {"initial": round(total_budget, 2), "currency": "USD"}
        }
    }
    return {"access_token": sign_jwt(passport), "token_type": "Bearer", "expires_in": 3600, "agent_id": agent_id}
```

---

## 4) ARIA Gateway, BFF, Tool Registry, Receipt Vault

No functional changes required for this step. They will **automatically benefit** from Membership because PDP and IdP now pull graph truth. Keep your latest versions from the previous response.

---

## 5) `docker-compose.yml` (UPDATED)

Add **Neo4j** and **Membership** and wire **MEMBERSHIP\_URL** into IdP + PDP.

```yaml
version: '3.9'
services:
  redis:
    image: redis:7
    ports: ["6379:6379"]

  neo4j:
    image: neo4j:5
    ports:
      - "7474:7474"   # browser (optional)
      - "7687:7687"   # bolt
    environment:
      - NEO4J_AUTH=neo4j/test
      - NEO4J_dbms_memory_heap_initial__size=512m
      - NEO4J_dbms_memory_heap_max__size=512m
    volumes:
      - neo4j-data:/data

  membership:
    build: ./membership
    ports: ["8085:8085"]
    environment:
      - NEO4J_URI=bolt://neo4j:7687
      - NEO4J_USER=neo4j
      - NEO4J_PASSWORD=test
    command: uvicorn main:app --host 0.0.0.0 --port 8085
    depends_on: [neo4j]

  tool-registry:
    build: ./tool_registry
    ports: ["8081:8081"]
    environment: {}
    command: uvicorn main:app --host 0.0.0.0 --port 8081

  pdp:
    build: ./pdp
    ports: ["8000:8000"]
    environment:
      - MEMBERSHIP_URL=http://membership:8085
      - POLICY_VERSION=2025-08-10.3
      - MODEL_ALLOW=gpt-4.1,gpt-4o-mini
      - EGRESS_ALLOW=api.openai.com:443,tools.example.com:443
    command: uvicorn main:app --host 0.0.0.0 --port 8000
    depends_on: [membership]

  receipt-vault:
    build: ./receipt_vault
    ports: ["8084:8084"]
    environment:
      - RECEIPT_PRIVATE_KEY_PEM=${RECEIPT_PRIVATE_KEY_PEM}
    command: uvicorn main:app --host 0.0.0.0 --port 8084

  idp:
    build: ./idp
    ports: ["8082:8082"]
    environment:
      - ARIA_PAIRWISE_SALT=${PAIRWISE_SALT}
      - ARIA_ISSUER=https://idp.example.com
      - IDP_PRIVATE_KEY_PEM=${IDP_PRIVATE_KEY_PEM}
      - MEMBERSHIP_URL=http://membership:8085
      - TOOL_REGISTRY_URL=http://tool-registry:8081
    command: uvicorn main:app --host 0.0.0.0 --port 8082
    depends_on: [membership, tool-registry]

  aria:
    build: ./aria
    ports: ["8080:8080"]
    environment:
      - PDP_URL=http://pdp:8000
      - REGISTRY_URL=http://tool-registry:8081
      - RECEIPT_VAULT_URL=http://receipt-vault:8084
      - REDIS_URL=redis://redis:6379
    command: uvicorn main:app --host 0.0.0.0 --port 8080
    depends_on: [pdp, tool-registry, receipt-vault, redis]

  bff:
    build: ./bff
    ports: ["8083:8083"]
    environment:
      - PDP_URL=http://pdp:8000
      - RECEIPT_VAULT_URL=http://receipt-vault:8084
      - REDIS_URL=redis://redis:6379
      - PROVIDER_BASE=http://provider:9999
    command: uvicorn main:app --host 0.0.0.0 --port 8083
    depends_on: [pdp, receipt-vault, redis]

volumes:
  neo4j-data:
```

---

## 6) How decisions now get computed (end‑to‑end)

1. **IdP** checks **Membership** for an active delegation; it embeds **budget** and **max\_steps** into the ARIA passport and pins tool schemas from the **Tool Registry**.
2. **ARIA Gateway** enforces schema pins, budget, egress, and calls **PDP**.
3. **PDP** calls **Membership** to:

   * verify the agent’s **capability** (user+agent)
   * produce `data_scope` (tenant\_ids + row filter)
   * decide `step_up` hints
   * optionally add `identity_chain` allow‑lists for a tool
4. **Gateway/BFF** enforce returned **constraints**, and after success, emit **receipts** per obligations.

---

## 7) Security & failure modes (unchanged defaults)

* **Fail‑closed**: no bound user, no active delegation, or capability mismatch → deny.
* **Membership outages**: PDP returns **deny** (optionally add a short fallback TTL cache on PDP if you need).
* **No tenants** for a user → `row_filter_sql = "1=0"` (no rows).
* **Schema pin mismatch**: ARIA Gateway denies preflight.

---

## 8) Migration steps (safe & incremental)

1. Bring up **Neo4j** and **Membership** with the schema from your old plan (you can seed synthetic data first).
2. Swap in the **updated IdP** and **PDP**; they point at `MEMBERSHIP_URL`.
3. Verify **PDP responses** now include `data_scope`, `step_up`, and optionally `identity_chain`.
4. Let existing **ARIA/BFF** keep working (no code changes).
5. Gradually move remaining constraint inputs from ad‑hoc sources into the **graph** and/or authored policy, as needed.

---

If you’d like, I can also supply **seed Cypher** files for a dev graph and a couple of **pytest** fixtures that spin Neo4j in a container to validate the PIP responses.

---

### Dev seeds and tests

- Seeds
  - Location: `membership/seeds/pip_minimal.cypher`
  - Loads: one demo user, tenant, agent, active delegation with `budget_usd` and `max_steps`, capabilities, and tool → SaaS app with scopes.
  - Loader: `python membership/scripts/seed_neo4j.py --uri bolt://localhost:7687 --user neo4j --password test`

- Tests
  - Unit tests: `membership/tests/test_pip_endpoints.py` (router shapes)
  - Integration tests (Neo4j-backed): `membership/tests/test_pip_integration_neo4j.py`
    - Auto-seeds Neo4j using the loader; skips if database not available.
  - Test env: ensures `SERVICE_CONFIG_DIR` is set via `tests/conftest.py`
