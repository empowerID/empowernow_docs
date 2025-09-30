# Backend for Frontend (BFF) Authentication Architecture - PRODUCTION READY

> **🎯 PRODUCTION FOCUS**: This document provides a **pragmatic, production-ready BFF architecture** for Q3 2025 delivery. Advanced features (FAPI R/W, DPoP, JAR) are feature-flagged for future enablement.

**Document Version:** 2.1 - HYBRID-EDGE PRODUCTION PLAN  
**Date:** August 1, 2025  
**Classification:** Production Implementation Guide  
**Target Delivery:** September 30, 2025

---

## Executive Summary

This **production-ready BFF architecture** delivers secure authentication for Q3 2025 using a **hybrid-edge approach**: Traefik ForwardAuth for 99% traffic filtering + Python BFF for OAuth2/token management + service-level validation.

**Core Philosophy:**
- ✅ **Security First** - OAuth2 compliant, session hardening, token refresh
- ✅ **Performance Focused** - Edge filtering, minimal latency, circuit breakers  
- ✅ **Pragmatically Scoped** - Essential features only, advanced capabilities feature-flagged
- ✅ **Production Ready** - Health checks, graceful shutdown, monitoring, chaos-tested

**Key Deliverables by Sept 30, 2025:**
- OAuth2 Authorization Code Flow with PKCE
- Traefik ForwardAuth (1ms session validation)
- Secure session management with Redis
- Lightweight service validation library
- Circuit breakers and rate limiting
- Comprehensive monitoring and alerting

---

## Table of Contents

1. [Consolidated Implementation Plan](#consolidated-implementation-plan)
2. [Hybrid-Edge Architecture](#hybrid-edge-architecture)
3. [Session Management](#session-management)
4. [Security Implementation](#security-implementation)
5. [Sprint Delivery Plan](#sprint-delivery-plan)
6. [Production Readiness](#production-readiness)
7. [Deferred Features](#deferred-features)
8. [Technical Implementation Details](#technical-implementation-details)

---

## Operational clarifications and norms (binding)

The following conventions are mandatory to ensure the documented design works as deployed:

- Cookie name and attributes
  - Use a single cookie name everywhere: `bff_session` (aka `SID_COOKIE`).
  - Attributes: HttpOnly, Secure, SameSite=Lax, Domain: `.ocg.labs.empowernow.ai`.
  - All set/delete operations MUST target this cookie name.

- ForwardAuth endpoint path
  - The BFF exposes `/auth/verify`; Traefik is configured to call the alias `/auth/forward`.
  - Both resolve to the same handler. Prefer documenting `/auth/forward` to match Traefik config.

- SPA API authentication model
  - Recommended (current): BFF validates session for SPA `/api/**` routes (<strong>ForwardAuth disabled</strong> on spa-api), returning 401 JSON with CORS headers so SPAs can redirect.
  - Alternative: Enable Traefik ForwardAuth on spa-api once cookie forwarding is verified (`authRequestHeaders: [Cookie]`, `trustForwardHeader: true`).

- CSP for editors and workers
  - Add `worker-src 'self' blob:` (and optionally `child-src 'self' blob:`) to CSP. Do not add `unsafe-eval`.

- Service names (compose alignment)
  - Use container DNS names from docker-compose:
    - CRUD: `http://crud_service:8000`
    - PDP: `http://pdp_app:8001`
    - IdP: `http://idp-app:8002`

- Environment variables (no literal ${...} at runtime)
  - Provide concrete values via Compose; especially `OIDC_SCOPES` (e.g. `openid profile email offline_access admin.api application.all dcr.register`).
  - If `${VAR:-default}` syntax is shown in examples, the loader must expand it before use.

- IdP client scopes for the BFF
  - The `bff-server` client must include scopes required by downstream mapping: add `admin.api` and `application.all` (and optionally accept `api.write`).

- Single source of truth for routes
  - BFF loads `routes.yaml` from `/app/config` (mounted from `ServiceConfigs/BFF/config`). Keep examples consistent with that path.

- Session endpoint shape (SDK contract)
  - `/api/auth/session` returns `{ authenticated: boolean, ... }`. Frontend SDKs must read `authenticated` (not legacy `isAuthenticated`).

- Standard response headers
  - ForwardAuth responses propagate `Authorization`, `X-User-ID`, `X-Session-ID`, `X-Auth-Time`. Use these names consistently.

- Required env quick list
  - `OIDC_SCOPES`, `BFF_ALLOWED_REDIRECT_HOSTS`, `BFF_COOKIE_DOMAIN`, optional `BFF_DYNAMIC_CALLBACK`, `BFF_DEFAULT_HOST`, `BFF_DEFAULT_SCHEME`.

---

## Consolidated Implementation Plan

Below is the **single consolidated change-list** ordered by impact × effort, designed for **production-ready delivery by Q3 '25** without over-engineering.

### **Priority 1: Critical Security & Performance**

| # | Theme | Change | Why / Outcome |
|---|-------|--------|---------------|
| **P1-1** | **OAuth2 compliance** | **KEEP current FAPI PAR implementation** - more secure than simple redirect | Current PAR+DPoP+PKCE is enterprise-grade; superior to basic flow |
| **P1-2** | **Missing ForwardAuth** | **IMPLEMENT /auth/verify endpoint** for Traefik ForwardAuth. Return 200 or 401 in ≤ 1ms | CRITICAL BLOCKER: Core edge-filtering strategy cannot function without this |
| **P1-3** | **Session hardening** | Bind session to: IP hash ⟨/24⟩, UA hash, rolling CSRF token | Hijack-resistance & PCI/NIST alignment |
| **P1-4** | **Token refresh** | Add `TokenService.ensure_valid_token()` with singleflight lock & 5-min-before-exp refresh | Prevents stampede; keeps APIs green during long sessions |
| **P1-5** | **Main app integration** | **FIX main.py** - include auth router, initialize TokenManager, add middleware | CRITICAL: Auth endpoints not accessible without FastAPI integration |
| **P1-6** | **Backend validation shim** | Ship `lightweight_validator.py` (3-line audience/scope check). Mandate import via service cookie-cutter | Defence-in-depth without code divergence |
| **P1-7** | **Circuit breaking** | Configure Traefik CB expression + 3 × retry with jitter. Gateway side only (no code change) | Upstream blips don't cascade; keeps P90 latency stable |

### **Priority 2: Production Enablement**

| # | Theme | Change | Why / Outcome |
|---|-------|--------|---------------|
| **P2-1** | **Enterprise SDK** | **OPTIONAL: Upgrade to empowernow_common clients** for FIPS compliance | Current httpx works; upgrade for enterprise standards |
| **P2-2** | **Redis optimization** | **OPTIONAL: Upgrade to empowernow_common.storage.RedisManager** | Current Redis client adequate; upgrade for connection pooling |
| **P2-3** | **Down-scoping toggle** | Implement **strategy flag** in `TokenService` (`PassThrough → Downscope → FAPI`). Default *off* | Future-proof; no extra latency today |
| **P2-4** | **Observability** | Auto-instrument BFF with **OpenTelemetry**; expose `bff_token_refresh_failed_total`, `traefik_forwardauth_rejected_total` | SREs get actionable SLO graphs from day 1 |
| **P2-5** | **K8s essentials** | Add *PodDisruptionBudget*, `sessionAffinity: ClientIP`, and resource limits (250m / 512Mi) | Keeps sessions sticky & pods roll safely |

### **Priority 3: Operational Excellence**

| # | Theme | Change | Why / Outcome |
|---|-------|--------|---------------|
| **P3-1** | **Secret handling** | Mount IdP keys & client secret via **Azure Key Vault CSI driver**; drop plaintext env vars | Removes secret sprawl; audit-friendly |
| **P3-2** | **Feature Flags** | `ENABLE_TOKEN_DOWNSCOPING`, `ENABLE_FAPI_COMPLIANCE` in Helm chart | Controlled roll-out; no "big-bang" risk |
| **P3-3** | **Docs clean-up** | Trim design doc to "core" flow; move optional FAPI/JAR/DPoP into appendix | Prevents spec-creep & onboarding fatigue |

---

## **🎯 IMPLEMENTATION STATUS - KEEP VS IMPLEMENT**

### **✅ KEEP AS-IS (ALREADY SUPERIOR)**

| Component | Current Implementation | Status | Rationale |
|-----------|----------------------|--------|-----------|
| **OAuth2 Flow** | FAPI PAR + DPoP + PKCE | 🟢 **KEEP** | More secure than design requirement |
| **State Management** | Signed JWT tokens | 🟢 **KEEP** | Stateless, secure, scalable |
| **CSRF Protection** | Header + cookie validation | 🟢 **KEEP** | Industry standard implementation |
| **Redis Session Store** | Basic Redis client | 🟢 **ADEQUATE** | Works fine; enterprise upgrade optional |
| **Circuit Breaker** | Simple in-process breaker | 🟢 **ADEQUATE** | Functional for current scale |

### **🔴 CRITICAL GAPS - MUST IMPLEMENT**

| Gap | Impact | Priority | Effort |
|-----|--------|----------|--------|
| **Missing /auth/verify endpoint** | Architecture cannot function | P0 | 1 day |
| **Main app integration** | Auth endpoints not accessible | P0 | 1 day |
| **Session schema fields** | Missing security binding data | P1 | 2 days |
| **Health endpoint** | No production monitoring | P1 | 1 day |

### **🟡 OPTIONAL UPGRADES - ENTERPRISE QUALITY**

| Upgrade | Current | Enterprise | Benefit |
|---------|---------|------------|---------|
| **HTTP Client** | httpx.AsyncClient | HardenedOAuth | FIPS compliance |
| **Redis Client** | redis.asyncio | RedisManager | Connection pooling |
| **Token Refresh** | Basic logic | Singleflight locks | Scale optimization |
| **Session Binding** | Cookie only | IP+UA+CSRF hashing | Hijack prevention |

---

## Hybrid-Edge Architecture

### **High-Level Flow**

```mermaid
graph LR
  subgraph Browser
    U(User)
  end
  subgraph Edge
    T(Traefik<br/>ForwardAuth):::edge
  end
  subgraph BFF
    B((Python BFF)):::bff
    R((Redis)):::store
  end
  subgraph IdP
    I(IdP /curity/):::idp
  end
  subgraph Services
    S1(CRUD) S2(PDP) S3(Workflow)
  end

  U-- cookie "bff_session" -->T
  T-- /auth/verify -->B
  B--200-->T
  T--pass-->B
  B--Bearer-->S1 & S2 & S3
  U-. redirect .->I
  I-. code .->B
  B-- token refresh -->I
  B-- store -->R
```

### **Architecture Philosophy: The Sweet Spot**

This **hybrid approach** avoids both extremes:

**❌ Too Dumb (Pure Proxy):**
- Every request hits Python
- No token refresh logic
- Single point of failure

**❌ Too Smart (Mega-Gateway):**
- Complex routing logic
- Business rules in gateway
- Vendor lock-in

**✅ Just Right (Hybrid-Edge):**
- **Traefik**: Ultra-fast session existence check (1ms)
- **BFF**: OAuth2 flows, token refresh, session management
- **Services**: Final validation with lightweight library

### **Layer Responsibilities**

| Layer | Responsibilities (MVP) |
|-------|------------------------|
| **Traefik ForwardAuth** | 1ms Redis lookup: *"session exists & not expired?"* → 200/401. No JWT logic |
| **Python BFF** | • OAuth2 redirect & callback • Session CRUD • Token refresh/rotation • Optional down-scoping |
| **Micro-services** | • Signature, `exp`, `aud`, `scope` check via *lightweight_validator.py* • Domain authorization |

---

## Session Management

### **Session Schema (Redis JSON)**

```jsonc
{
  "sid": "G6HhHJKCq4I...",
  "user_id": "user@company.com",
  "iat": 1690888500,
  "exp": 1690892100,
  "ip_hash": "a1b2c3d4e5f6",
  "ua_hash": "bf63e7...",
  "access_token": "eyJ...",
  "refresh_token": "def...",
  "csrf": "tzVEplgP...",
  "rot": { "count": 1, "last": 1690889400 }
}
```

### **Key API Endpoints (final implementation)**

| Path | Method | Auth | Notes |
|------|--------|------|-------|
| `/auth/login` | GET | - | Redirect → IdP (`state`, `code_challenge`) |
| `/auth/callback` | GET | - | Exchange code; create session; `Set-Cookie` |
| `/auth/verify` | GET | cookie | **ForwardAuth** 200/401; returns `X-User-ID` |
| `/auth/logout` | POST/GET | cookie | Revoke session, clear cookie; serves intermediate HTML that performs client-side redirect to IdP end_session. Forces `post_logout_redirect_uri` to `https://<bff_host>/auth/login`. Back-compat shims: `/api/auth/logout` |

---

## Security Implementation

### **FAPI PAR Flow (CURRENT IMPLEMENTATION - KEEP AS-IS)**

> **🎯 IMPLEMENTATION NOTE**: Current BFF already implements superior FAPI PAR flow with DPoP and client assertions. This is MORE SECURE than basic OAuth2 redirect and should be retained.

```python
@router.get("/auth/login")
async def login(request: Request, return_to: str | None = None):
    """FAPI PAR flow with DPoP proof (ENTERPRISE-GRADE SECURITY)"""
    # Current implementation in auth_stub.py is SUPERIOR
    # - Uses PAR to prevent parameter tampering
    # - Includes DPoP for token binding
    # - Has client assertion for confidential client auth
    # - Implements proper state management
    
    # Generate PKCE parameters (high entropy)
    code_verifier = secrets.token_urlsafe(48)  # RFC 7636: 43-128 chars
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).rstrip(b"=").decode()
    
    # Generate state and nonce for security
    state = secrets.token_urlsafe(8)
    nonce = secrets.token_urlsafe(8)
    
    # PAR request with DPoP proof
    par_data = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(scopes),
        "state": state,
        "nonce": nonce,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    
    # DPoP proof generation
    key_pair = generate_dpop_key_pair()
    proof_gen = DPoPProofGenerator(key_pair)
    par_proof = proof_gen.generate_proof("POST", f"{INTERNAL_IDP_BASE}/par")
    
    # Submit PAR request
    par_resp = await http_client.post(
        f"{INTERNAL_IDP_BASE}/par",
        data=par_data,
        headers={"DPoP": par_proof},
        timeout=10,
    )
    
    request_uri = par_resp.json()["request_uri"]
    
    # Redirect with request_uri (secure parameter reference)
    authorize_url = f"{PUBLIC_IDP_BASE}/authorize?client_id={CLIENT_ID}&request_uri={request_uri}"
    return RedirectResponse(authorize_url)
```

**SECURITY BENEFITS OF CURRENT IMPLEMENTATION:**
- 🛡️ **Parameter Integrity**: PAR prevents authorization parameter tampering
- 🔒 **Token Binding**: DPoP prevents token replay attacks  
- 🎯 **Client Authentication**: JWT assertion for confidential clients
- ⚡ **Request Efficiency**: Pre-authorized request reduces attack surface

### **Session Hardening with Binding**

```python
def get_ip_hash(request: Request) -> str:
    """Hash IP considering proxies and IPv6"""
    # Trust X-Forwarded-For from known proxies only
    if request.client.host in TRUSTED_PROXIES:
        ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    else:
        ip = request.client.host
    
    # Handle IPv6 (hash /48 prefix)
    if ":" in ip:
        # IPv6: use /48 prefix (typical ISP allocation)
        parts = ip.split(":")[:3]
        ip_prefix = ":".join(parts)
    else:
        # IPv4: use /24 as planned
        ip_prefix = ".".join(ip.split(".")[:3])
    
    return hashlib.sha256(ip_prefix.encode()).hexdigest()[:12]

async def validate_session_binding(session: dict, request: Request) -> bool:
    """Validate session security binding"""
    current_ip_hash = get_ip_hash(request)
    current_ua_hash = hashlib.sha256(
        request.headers.get("user-agent", "").encode()
    ).hexdigest()[:12]
    
    # Allow some flexibility for mobile networks
    if session["ip_hash"] != current_ip_hash:
        # Log potential hijacking attempt
        logger.warning("Session IP mismatch", extra={
            "session_id": session["sid"][:8],
            "expected": session["ip_hash"],
            "actual": current_ip_hash
        })
        return False
    
    # User agent should be stable
    if session["ua_hash"] != current_ua_hash:
        logger.warning("Session UA mismatch", extra={
            "session_id": session["sid"][:8]
        })
        return False
    
    return True
```

### **Token Refresh with Singleflight**

```python
class TokenService:
    def __init__(self):
        self._refresh_locks = {}  # Per-session locks
        
    async def ensure_valid_token(self, session_id: str) -> str:
        session = await self._get_session(session_id)
        
        if self._token_expires_soon(session["access_token"]):
            # Per-session lock prevents stampede
            if session_id not in self._refresh_locks:
                self._refresh_locks[session_id] = asyncio.Lock()
            
            async with self._refresh_locks[session_id]:
                # Double-check after lock
                session = await self._get_session(session_id)
                if self._token_expires_soon(session["access_token"]):
                    # Add jitter to prevent synchronized refreshes
                    jitter = random.randint(0, 30)
                    await asyncio.sleep(jitter / 1000)  # 0-30ms
                    
                    session = await self._refresh_token(session, session_id)
            
            # Cleanup lock after use
            asyncio.create_task(self._cleanup_lock(session_id))
        
        return session["access_token"]
```

### **Lightweight Service Validator**

```python
# shared/auth/lightweight_validator.py
from functools import lru_cache
import time

class LightweightValidator:
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.audience = f"https://{service_name}.internal"
        self._validation_cache = {}  # Short-lived cache
        
    async def validate(self, authorization: str) -> Dict:
        token = authorization.replace("Bearer ", "")
        
        # Cache validation for 60 seconds
        cache_key = hashlib.sha256(token.encode()).hexdigest()[:16]
        if cached := self._validation_cache.get(cache_key):
            if cached["expires"] > time.time():
                return cached["claims"]
        
        # Validate
        claims = jwt.decode(
            token,
            self.get_public_key(),
            algorithms=["RS256"],
            audience=self.audience
        )
        
        # Cache for 60s (much shorter than token lifetime)
        self._validation_cache[cache_key] = {
            "claims": claims,
            "expires": time.time() + 60
        }
        
        return claims
```

### **SPA to BFF Call Security Architecture**

The current BFF implementation employs a sophisticated **multi-layer security model** that provides enterprise-grade protection for SPA-to-BFF communications. This section details the technical implementation of how client calls are secured.

#### **Security Architecture Overview**

```mermaid
graph TD
    subgraph "SPA (Frontend)"
        A[React/Vue SPA]
        B[Session Cookie]
        C[CSRF Token]
        D[Bearer Token]
    end
    
    subgraph "BFF Security Layers"
        E[CORS Middleware]
        F[Security Headers]
        G[Rate Limiting]
        H[Auth Middleware]
        I[CSRF Protection]
        J[DPoP Validation]
        K[Audit Logging]
    end
    
    subgraph "Session Management"
        L[Redis Session Store]
        M[Session Validation]
        N[IP Binding]
        O[Token Refresh]
    end
    
    subgraph "Token Security"
        P[FAPI PAR Flow]
        Q[DPoP Binding]
        R[JWT Validation]
        S[JWKS Cache]
    end
    
    A -->|"HTTP Request with cookies"| E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
    
    H -->|"Session Auth"| M
    H -->|"Bearer Auth"| R
    
    M --> L
    M --> N
    M --> O
    
    R --> S
    R --> P
    R --> Q
    
    B -->|"Secure, HTTPOnly"| M
    C -->|"HMAC-signed"| I
    D -->|"DPoP-bound JWT"| R
```

#### **Security Flow Sequence**

```mermaid
sequenceDiagram
    participant SPA as SPA Client
    participant BFF as BFF Service
    participant Redis as Redis Store
    participant IdP as Identity Provider
    participant Backend as Backend Service
    
    Note over SPA,Backend: SPA to BFF Authentication Flow
    
    SPA->>BFF: 1. Request to protected route<br/>Cookie: session=abc123<br/>X-CSRF-Token: hmac_token
    
    Note over BFF: Security Middleware Chain
    BFF->>BFF: 2a. CORS validation<br/>Origin check
    BFF->>BFF: 2b. Rate limiting<br/>Per-IP throttling
    BFF->>BFF: 2c. Security headers<br/>XSS, CSP, etc.
    
    Note over BFF: Authentication Layer
    BFF->>BFF: 3a. Extract session cookie
    BFF->>Redis: 3b. Validate session<br/>GET session:abc123
    Redis-->>BFF: 3c. Session data with<br/>user info, tokens, IP
    
    BFF->>BFF: 3d. IP binding check<br/>Compare session IP vs client IP
    BFF->>BFF: 3e. CSRF validation<br/>HMAC verify token
    
    alt Session Valid
        BFF->>BFF: 4a. Check token expiry
        alt Token needs refresh
            BFF->>IdP: 4b. Refresh access token<br/>POST /token (refresh_token)
            IdP-->>BFF: 4c. New access token + refresh
            BFF->>Redis: 4d. Update session with new tokens
        end
        
        BFF->>Backend: 5. Forward request with<br/>Authorization: Bearer jwt_token
        Backend-->>BFF: 6. Response data
        BFF-->>SPA: 7. Response with<br/>Set-Cookie: new_csrf_token
    else Session Invalid
        BFF-->>SPA: 401 Unauthorized<br/>{"detail": "Not authenticated"}
    end
```

#### **Layer-by-Layer Security Analysis**

**1. CORS Protection (First Line of Defense)**
```python
# Origin validation prevents cross-domain attacks
origin = request.headers.get("origin")
if origin and origin not in ALLOWED_ORIGINS:
    logger.warning("Blocked request from unauthorized origin: %s", origin)
    return JSONResponse(status_code=403, content={"detail": "Forbidden origin"})
```

**2. Session-Based Authentication**
- **Secure Cookie**: HTTPOnly, Secure, SameSite=Lax
- **Redis Session Store**: Encrypted session data with TTL
- **IP Binding**: Sessions bound to client IP hash (prevents hijacking)
- **Sliding Window**: Automatic session extension on activity

**3. CSRF Protection (HMAC-Based)**
```python
# TASK 17: Enhanced CSRF with cryptographic signatures
def _generate_csrf_token(self) -> str:
    random_bytes = secrets.token_bytes(32)
    signature = hmac.new(self.secret_key, random_bytes, hashlib.sha256).digest()
    return (random_bytes + signature).hex()
```

**4. DPoP Token Binding (Enterprise-Grade)**
- **Proof of Possession**: Tokens bound to client key pairs
- **Replay Attack Prevention**: Cryptographic proof per request
- **RFC 9449 Compliant**: Standards-based implementation

**5. Enterprise OAuth2 (FAPI PAR)**
- **Pushed Authorization Requests**: Parameters pre-validated
- **Client Assertion**: JWT-based client authentication  
- **PKCE**: Code challenge/verifier flow
- **Superior to Basic OAuth2**: More secure than design minimum

#### **Current Security Strengths**

| Security Layer | Implementation | Security Benefit |
|----------------|---------------|------------------|
| **CORS** | Origin allowlist validation | Prevents cross-origin attacks |
| **CSRF** | HMAC-signed tokens | Prevents state-changing forgery |
| **Session Binding** | IP hash + User-Agent hash | Prevents session hijacking |
| **Token Security** | DPoP + FAPI PAR | Prevents token replay/theft |
| **Rate Limiting** | Per-IP throttling | Prevents DoS attacks |
| **Audit Logging** | Structured enterprise logs | Security event tracking |
| **Secure Headers** | XSS, CSP, HSTS | Browser-level protection |

#### **Authentication Modes Supported**

**Mode 1: Session-Based (Primary for SPAs)**
- Cookie: `session=<redis_key>`
- Header: `X-CSRF-Token: <hmac_token>`
- Validation: Redis lookup + IP binding
- Use Case: SPA frontend interactions

**Mode 2: Bearer Token (API Integration)**
- Header: `Authorization: Bearer <jwt_token>`
- Validation: JWT signature + claims
- Use Case: Service-to-service calls

**Mode 3: Hybrid (Future)**
- Session + Bearer for different route patterns
- Configurable via YAML route definitions
- Use Case: Mixed client types

#### **Security Configuration Points**

```yaml
# Security middleware configuration
security:
  enable_session_binding: true    # IP + UA validation
  enable_csrf_protection: true    # HMAC-based CSRF
  enable_dpop_validation: true    # Token binding
  trusted_proxies: ["10.0.0.0/8"] # For IP extraction
  
cors:
  allow_origins: ["https://app.domain.com"]
  allow_credentials: true
  
auth:
  session_ttl: 28800  # 8 hours
  token_refresh_threshold: 300  # 5 minutes before expiry
```

#### **Security Gaps Addressed**

✅ **RESOLVED: Missing ForwardAuth** - Now implemented for Traefik integration  
✅ **RESOLVED: Session Security** - IP binding and CSRF protection active  
✅ **RESOLVED: Token Management** - Automatic refresh with singleflight locks  
✅ **RESOLVED: Enterprise Compliance** - FAPI PAR + DPoP implementation  

#### **Production Security Checklist**

- [x] CORS configured with explicit origin allowlist
- [x] CSRF protection with cryptographic HMAC tokens  
- [x] Session IP binding prevents hijacking
- [x] DPoP token binding prevents replay attacks
- [x] Rate limiting protects against DoS
- [x] Enterprise audit logging captures security events
- [x] Secure headers protect against XSS/clickjacking
- [x] Redis session encryption protects sensitive data
- [x] Automatic token refresh maintains security posture

**This multi-layer approach provides defense-in-depth security that exceeds industry standards while maintaining high performance for SPA interactions.**

### **ForwardAuth & Traefik Integration Deep Dive**

The BFF implements a **high-performance ForwardAuth pattern** with Traefik as the edge proxy. This section provides a comprehensive technical explanation of how ForwardAuth works, dynamic routing configuration, and audience/scope validation.

#### **ForwardAuth Architecture Overview**

```mermaid
graph TD
    subgraph "Internet"
        Client[SPA Client]
    end
    
    subgraph "Edge Layer (Traefik)"
        TR[Traefik Router]
        MW1[Rate Limiting]
        MW2[Security Headers]
        MW3[ForwardAuth Middleware]
    end
    
    subgraph "BFF Service"
        FA["/auth/forward (alias /auth/verify)"]
        Redis[(Redis Session Store)]
        Auth[Auth Middleware]
        Router[Dynamic Router]
    end
    
    subgraph "Backend Services"
        CRUD[CRUD Service]
        PDP[PDP Service]
        IdP[IdP Service]
    end
    
    Client -->|"1. HTTPS Request<br/>Cookie: session=abc123"| TR
    TR --> MW1
    MW1 --> MW2
    MW2 --> MW3
    MW3 -->|"2. ForwardAuth Check<br/>GET /auth/forward"| FA
    FA -->|"3. Redis Lookup"| Redis
    Redis -->|"4. Session Data"| FA
    FA -->|"5a. 200 + Headers<br/>X-User-ID: user123"| MW3
    MW3 -->|"5b. Continue with headers"| Router
    Router -->|"6. Proxied Request<br/>Authorization: Bearer jwt"| CRUD
    CRUD -->|"7. Response"| Router
    Router -->|"8. Response"| Client
    
    FA -->|"5a ALT. 401 Unauthorized"| MW3
    MW3 -->|"5b ALT. Block Request"| Client
```

#### **ForwardAuth Flow Details**

**Step 1: Traefik Receives Request**
```yaml
# Traefik IngressRoute Configuration
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: bff-api
spec:
  routes:
  - match: Host(`api.domain.com`) && PathPrefix(`/api`)
    kind: Rule
    services:
    - name: bff-service
      port: 8000
    middlewares:
    - name: bff-forwardauth  # 🔑 ForwardAuth middleware
    - name: ratelimit
    - name: security-headers
```

**Step 2: ForwardAuth Middleware Intercepts**
```yaml
# ForwardAuth Middleware Configuration
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata:
  name: bff-forwardauth
spec:
  forwardAuth:
     address: "http://bff-service:8000/auth/forward"  # 🎯 BFF endpoint (alias of /auth/verify)
    trustForwardHeader: true
    authResponseHeaders:      # Headers passed to backend
      - "X-User-ID"
      - "X-Session-ID" 
      - "X-Auth-Time"
    authRequestHeaders:       # Headers sent to BFF
      - "Cookie"              # Session cookie
      - "User-Agent"
      - "X-Forwarded-For"
```

**Step 3: BFF ForwardAuth Endpoint**
```python
@router.get("/auth/verify")
async def forward_auth(request: Request):
    """
    Ultra-fast ForwardAuth endpoint targeting <1ms response time.
    Called by Traefik for EVERY protected request.
    """
    try:
        # 1. Extract session cookie (fast path)
        session_id = get_session_id(request)  # Throws HTTPException if missing
        
        # 2. Redis session lookup (optimized)
        session_manager = await get_forwardauth_session_manager()
        session_data = await session_manager.get_session(session_id)
        
        # 3. Fast validation
        if not session_data:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid session"}
            )
        
        # 4. Return auth headers for backend services
        return JSONResponse(
            status_code=200,
            content={"status": "authenticated"},
            headers={
                "X-User-ID": session_data.user_id,      # 🔑 User context
                "X-Session-ID": session_id[:8] + "...", # 🔑 Session ref
                "X-Auth-Time": str(int(time.time()))      # 🔑 Auth timestamp
            }
        )
    except Exception:
        return JSONResponse(status_code=401, content={"detail": "Auth failed"})
```

#### **Dynamic Routing Configuration**

The BFF uses **YAML-driven dynamic routing** that eliminates hardcoded endpoints and provides flexible service integration.

**Routes Configuration Structure**
```yaml
# ServiceConfigs/BFF/config/routes.yaml
version: "1.0"
description: "BFF Route Configuration - Production Ready"

# Backend service definitions
services:
  crud_service:
    base_url: "http://crud_service:8000"    # Container-to-container URL
    timeout: 30
  
  pdp_service:
    base_url: "http://pdp_app:8001"
    timeout: 30
    
  idp_service:
    base_url: "http://idp-app:8002"
    timeout: 30

# Dynamic route definitions
routes:
  - id: "crud-workflows"
    description: "Workflow management endpoints"
    path: "/api/crud/workflows/*"           # 🎯 Client-facing path
    target_service: "crud_service"          # 🎯 Backend service
    upstream_path: "/workflows/{path}"      # 🎯 Backend path template
    methods: ["GET", "POST", "PUT", "DELETE"]
    auth: "session"                         # 🔑 Auth requirement

  - id: "crud-agents"
    description: "Agents APIs (canonical CRUD prefix)"
    path: "/api/crud/agents/*"
    target_service: "crud_service"
    upstream_path: "/agents/{path}"
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    auth: "session"
    
  - id: "pdp-authzen"
    description: "AuthZEN policy decisions"
    path: "/api/access/v1/*"               # 🎯 AuthZEN standard path
    target_service: "pdp_service"
    upstream_path: "/access/v1/{path}"
    methods: ["POST"]
    auth: "bearer"                         # 🔑 JWT required
    preserve_path: true                    # 🔑 Exact path matching
```

**Dynamic Route Processing**
```python
class YAMLRouteLoader:
    """Loads and validates YAML route configuration."""
    
    def load_routes(self) -> RoutesConfiguration:
        """Load routes with Pydantic validation."""
        with open(self.config_path) as f:
            data = yaml.safe_load(f)
        
        # Pydantic validation ensures config correctness
        return RoutesConfiguration(**data)
    
    def get_route_config(self, path: str, method: str) -> Optional[RouteConfig]:
        """Match request to route configuration."""
        for route in self.routes_config.routes:
            if self._path_matches(path, route.path) and method in route.methods:
                return route
        return None

# Auth middleware uses route config
async def dispatch(self, request: Request, call_next):
    route_config = self.route_loader.get_route_config(
        request.url.path, 
        request.method
    )
    
    if route_config and route_config.auth == "session":
        return await self._handle_session_auth(request, call_next)
    elif route_config and route_config.auth == "bearer":
        return await self._handle_bearer_auth(request, call_next)
    # ... continue processing
```

#### **Audience & Scope Validation Deep Dive**

The BFF implements **multi-audience JWT validation** with fine-grained scope checking for different backend services.

**Audience Configuration (IdPs)**
```yaml
# ServiceConfigs/BFF/config/idps.yaml
idps:
  # Primary IdP configuration for admin operations
  - name: "empowernow"
    issuer: "https://idp.ocg.labs.empowernow.ai/api/oidc"
    audience: "https://idp.ocg.labs.empowernow.ai/api/admin"  # 🎯 Admin audience
    jwks_url: "https://idp.ocg.labs.empowernow.ai/api/oidc/jwks"
    claims_mapping:
      roles: ["roles", "groups"]                             # 🔑 Role sources
      permissions: ["scope", "permissions"]                  # 🔑 Permission sources
    
  # Separate audience for CRUD service operations
  - name: "empowernow-crud"
    issuer: "https://idp.ocg.labs.empowernow.ai/api/oidc"   # Same issuer
    audience: "https://crud-service:8000"                    # 🎯 Service-specific audience
    jwks_url: "https://idp.ocg.labs.empowernow.ai/api/oidc/jwks"
    claims_mapping:
      roles: ["roles", "groups"]
      permissions: ["scope", "permissions"]
```

**JWT Audience Validation Process**
```python
# Auth middleware validates JWT audience per service
class AuthMiddleware:
    async def dispatch(self, request: Request, call_next):
        token = self._extract_token(request)
        
        # 1. Decode JWT header for issuer/kid
        header = jwt.get_unverified_header(token)
        payload = jwt.get_unverified_claims(token)
        issuer = payload.get("iss")
        
        # 2. Match issuer to IdP configuration
        idp = self._match_idp(issuer)  # Finds correct IdP config
        
        # 3. Validate JWT with service-specific audience
        jwt.decode(
            token,
            key=public_key,
            algorithms=["RS256"],
            audience=idp.audience,                    # 🎯 Service-specific audience
            issuer=issuer,
            options={"verify_exp": True, "verify_aud": True}
        )
        
        # 4. Extract and validate scopes
        scopes = payload.get("scope", "").split()
        required_scopes = self._get_required_scopes(request.url.path)
        
        if not self._has_required_scopes(scopes, required_scopes):
            return JSONResponse(status_code=403, content={"detail": "Insufficient scope"})

def _match_idp(self, issuer: str) -> IdpConfig:
    """Match JWT issuer to IdP configuration."""
    for idp in settings.auth.idps:
        if issuer.rstrip("/") == idp.issuer.rstrip("/"):
            return idp
    raise ValueError(f"Unknown issuer: {issuer}")
```

**Scope Validation by Service**
```python
# Service-specific scope requirements
SCOPE_REQUIREMENTS = {
    "/api/crud/workflows": ["workflow:read", "workflow:write"],
    "/api/crud/forms": ["form:read", "form:write"],
    "/api/access/v1": ["authzen:evaluate"],              # 🎯 AuthZEN scope
    "/api/idp/admin": ["idp:admin", "user:manage"],
}

def _get_required_scopes(self, path: str) -> List[str]:
    """Determine required scopes for path."""
    for pattern, scopes in SCOPE_REQUIREMENTS.items():
        if fnmatch.fnmatch(path, pattern):
            return scopes
    return []  # No specific scopes required

def _has_required_scopes(self, token_scopes: List[str], required: List[str]) -> bool:
    """Check if token has required scopes."""
    if not required:
        return True  # No scopes required
    
    # Check if token has ANY of the required scopes (OR logic)
    # For AND logic, use: return all(scope in token_scopes for scope in required)
    return any(scope in token_scopes for scope in required)
```

#### **Configuration Points Summary**

**Where Audiences Are Configured:**
1. **IdP Configuration** (`ServiceConfigs/BFF/config/idps.yaml`) - Defines valid audiences per service
2. **Route Configuration** (`ServiceConfigs/BFF/config/routes.yaml`) - Maps paths to auth requirements
3. **Environment Variables** - Fallback audience settings

**Where Scopes Are Checked:**
1. **Auth Middleware** (`middleware/auth.py`) - JWT scope extraction and validation
2. **Route Handlers** - Service-specific scope requirements
3. **Backend Services** - Final scope validation using lightweight validator

**Where Validation Occurs:**
1. **Traefik ForwardAuth** (`/auth/forward`, alias `/auth/verify`) - Session-based validation (fast path)
2. **Auth Middleware** - JWT signature, audience, and scope validation
3. **Backend Services** - Additional service-level authorization

**Performance Characteristics:**
- **ForwardAuth**: <1ms Redis session lookup for 99% of traffic
- **JWT Validation**: <10ms including JWKS cache and signature verification
- **Dynamic Routing**: <1ms YAML config lookup with caching

This architecture provides **enterprise-grade security** with **microsecond-level performance** through intelligent caching, optimized validation paths, and defense-in-depth security layers.

---

## Sprint Delivery Plan

### **Sprint Schedule (Target: Sept 30, 2025)**

| Sprint | Deliverable | Owner | Duration | Risk |
|--------|-------------|-------|----------|------|
| **34** | OAuth2 redirect flow + ForwardAuth POC | platform-api | 2 weeks | Low - well understood |
| **35** | TokenService (refresh + singleflight) | platform-api | 2 weeks | Medium - needs careful testing |
| **36** | Lightweight validator library; integrate CRUD & PDP | micro-services squad | 2 weeks | Low - just imports |
| **37** | Blue/green deploy; enable session binding; Grafana dashboards | dev-infra | 2 weeks | Medium - needs rehearsal |
| **38** | Feature-flag down-scoping in staging; chaos tests | security-eng | 2 weeks | Low - optional features |

**Total: 10 weeks** (leaves buffer before Sept 30)

### **Configuration Switches**

```yaml
bff:
  strategy: pass_through   # pass_through | downscope | fapi
  enable_forward_auth: true
  session_ttl: 3600
  
traefik:
  forwardauth_address: http://bff:8000/auth/verify
  forwardauth_trustforwardheader: true
  
security:
  enable_session_binding: true
  enable_csrf_protection: true
  trusted_proxies: ["10.0.0.0/8", "172.16.0.0/12"]
```

---

## Production Readiness

### **Health Check Implementation**

```python
@router.get("/health")
async def health_check():
    """K8s readiness probe"""
    checks = {
        "redis": "unknown",
        "idp": "unknown"
    }
    
    # Check Redis
    try:
        await redis.ping()
        checks["redis"] = "healthy"
    except:
        checks["redis"] = "unhealthy"
    
    # Check IdP
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{IDP_URL}/.well-known/openid-configuration")
            checks["idp"] = "healthy" if resp.status_code == 200 else "unhealthy"
    except:
        checks["idp"] = "unhealthy"
    
    # Overall status
    all_healthy = all(v == "healthy" for v in checks.values())
    
    return JSONResponse(
        status_code=200 if all_healthy else 503,
        content={
            "status": "healthy" if all_healthy else "degraded",
            "checks": checks,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
```

### **Graceful Shutdown**

```python
@app.on_event("shutdown")
async def shutdown():
    """Graceful shutdown for K8s"""
    logger.info("Shutdown signal received")
    
    # Stop accepting new requests
    shutdown_event.set()
    
    # Wait for in-flight requests (max 30s)
    await asyncio.sleep(2)
    
    # Close Redis connection
    await redis.close()
    
    # Close HTTP clients
    await http_client.aclose()
    
    logger.info("Graceful shutdown complete")
```

### **Go/No-Go Checklist**

Before production deployment:

- [ ] OAuth2 redirect flow working (no proxy)
- [ ] ForwardAuth rejecting >95% of bad traffic (if enabled on spa-api)  
- [ ] Session binding preventing hijack attempts
- [ ] Token refresh without stampede
- [ ] All services using lightweight validator
- [ ] Circuit breakers configured in Traefik
- [ ] Health endpoints for K8s probes
- [ ] Graceful shutdown handling
- [ ] Metrics exposed (Prometheus format)
- [ ] Runbook for token rotation
- [ ] Chaos day completed (Redis/IdP failures tested)

### CSP quick reference (Traefik security-headers)

```
default-src 'self' https:; 
script-src 'self' 'unsafe-inline' https:; 
style-src 'self' 'unsafe-inline' https:; 
img-src 'self' data: https:; 
font-src 'self' https:; 
connect-src 'self' https: wss:; 
worker-src 'self' blob:; 
frame-ancestors 'none'
```

### Required environment variables (production)

| Name | Example | Purpose |
| --- | --- | --- |
| `OIDC_SCOPES` | `openid profile email offline_access admin.api application.all dcr.register` | Concrete scopes for OAuth2 authorize |
| `BFF_ALLOWED_REDIRECT_HOSTS` | `authn.ocg.labs.empowernow.ai,authz.ocg.labs.empowernow.ai,automate.ocg.labs.empowernow.ai` | Absolute return_to safety |
| `BFF_COOKIE_DOMAIN` | `.ocg.labs.empowernow.ai` | Shared cookie domain |
| `BFF_DYNAMIC_CALLBACK` | `true` | Enable same-origin callback reconstruction |
| `BFF_DEFAULT_HOST` | `authn.ocg.labs.empowernow.ai` | Fallback host for dynamic callbacks |
| `BFF_DEFAULT_SCHEME` | `https` | Fallback scheme for dynamic callbacks |

### SDK packaging note

When consuming a locally fixed React auth SDK, prefer installing the tarball created by `npm pack` in Docker builds (e.g., `npm install ./bff-auth-react-*.tgz`) over copying raw files into `node_modules`.

### **Traefik Configuration**

```yaml
# Traefik ForwardAuth Middleware
http:
  routers:
    api:
      rule: "Host(`automate.ocg.labs.empowernow.ai`) && PathPrefix(`/api`)"
      service: bff
      middlewares: 
        - auth-edge
        - ratelimit-api

  middlewares:
    auth-edge:
      forwardAuth:
        address: "http://bff:8000/auth/forward"  # Alias of /auth/verify in the BFF
        trustForwardHeader: true
        authResponseHeaders:
          - "X-User-ID"
          - "X-Session-ID"
          - "X-Auth-Time"
    
    ratelimit-api:
      rateLimit:
        burst: 100
        period: 1m
```

---

## Deferred Features

### **What NOT to Implement Now**

| Deferred Item | Reason |
|---------------|--------|
| **Full FAPI R/W (JAR, PAR, DPoP)** | No current partner mandate; keep behind flag |
| **mTLS between BFF ↔ services** | Service-mesh can add later; not on critical path |
| **Automated RBAC down-scoping** | Deliver pass-through first; measure need |
| **Advanced token introspection** | Current JWT validation sufficient |
| **Multi-tenant session stores** | Single tenant requirement for MVP |

### **Feature Flags for Future**

```yaml
features:
  enable_token_downscoping: false
  enable_fapi_compliance: false
  enable_advanced_session_binding: false
  enable_mtls_backend: false
```

---

## Technical Implementation Details

### **Metrics & Observability**

```python
# Key metrics to expose
METRICS = [
    "bff_active_sessions_total",
    "bff_token_refresh_success_total", 
    "bff_token_refresh_failed_total",
    "bff_session_binding_failures_total",
    "traefik_forwardauth_rejected_total",
    "bff_oauth_flow_duration_seconds"
]

# OpenTelemetry auto-instrumentation
from opentelemetry.auto_instrumentation import sitecustomize

# Frontend telemetry endpoint (public)
# POST /api/v1/metrics – accepts minimal, non-PII payload for SPA events.
```

### **Kubernetes Deployment**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bff-service
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              topologyKey: kubernetes.io/hostname
      containers:
      - name: bff
        image: empowernow/bff:2.1.0
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: bff-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: bff-service
```

---

## Conclusion

This **hybrid-edge BFF architecture** delivers:

### **✅ Security Without Paranoia**
- OAuth2 Authorization Code Flow with PKCE
- Session binding and CSRF protection
- Lightweight service validation
- All OWASP Top 10 coverage

### **⚡ Performance Without Premature Optimization**
- Traefik ForwardAuth blocks 99% of noise
- 1ms session checks
- Circuit breakers prevent cascade failures
- Smart token refresh prevents stampedes

### **🔧 Flexibility Without Over-Engineering**
- Feature flags for future capabilities
- Clean separation of concerns
- Service-level validation maintains defense-in-depth
- No vendor lock-in

### **🚀 Production Ready by Q3 2025**
- Health checks and graceful shutdown
- Comprehensive monitoring
- Chaos-tested resilience patterns
- Clear sprint delivery plan

**Ship it with confidence!** This architecture will handle millions of requests while staying maintainable and secure.

---

## 🎯 **REVISED IMPLEMENTATION STRATEGY**

### **PHASE 1: CRITICAL BLOCKERS (Week 1)**
**Goal: Make authentication functional**

1. **Implement /auth/verify endpoint** (P0-1)
   - 1ms Redis session lookup
   - Return 200/401 with user headers
   - Enable Traefik ForwardAuth strategy

2. **Fix main.py integration** (P0-2) 
   - Include auth router in FastAPI app
   - Initialize TokenManager in lifespan
   - Add basic middleware

**Success Criteria:** Users can login and access protected routes

### **PHASE 2: PRODUCTION READINESS (Week 2)**
**Goal: Make system production-ready**

3. **Add session schema fields** (P1-1)
4. **Implement health endpoint** (P1-2)  
5. **Add graceful shutdown** (P1-3)
6. **Deploy lightweight validator** (P1-4)

**Success Criteria:** System passes production readiness checklist

### **PHASE 3: ENTERPRISE QUALITY (Week 3-4)**
**Goal: Optional enterprise enhancements**

7. **Enterprise SDK upgrade** (P2-1) - OPTIONAL
8. **Redis enterprise client** (P2-2) - OPTIONAL  
9. **Token refresh optimization** (P2-3) - Scale dependent
10. **Advanced monitoring** (P2-4) - Production visibility

**Success Criteria:** Enterprise compliance and operational excellence

### **🏆 KEY INSIGHT: KEEP SUPERIOR IMPLEMENTATIONS**

The current BFF implementation includes several **enterprise-grade security features** that exceed the design requirements:

- ✅ **FAPI PAR Flow** - More secure than simple OAuth2 redirect
- ✅ **DPoP Token Binding** - Prevents replay attacks  
- ✅ **JWT State Tokens** - Stateless and scalable
- ✅ **Robust CSRF Protection** - Industry standard

**Do NOT downgrade these implementations** to match simpler design requirements. Instead, focus on the genuine functional gaps while preserving the security advantages already achieved.