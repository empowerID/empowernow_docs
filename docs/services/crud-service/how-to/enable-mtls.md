---
title: "Enable mTLS for CRUD Service APIs"
description: "Step-by-step to enable mTLS at the edge (Traefik/Nginx), forward the verified client certificate, enforce PoP binding, and verify end-to-end."
sidebar_label: "Enable mTLS (Dev & Prod)"
keywords:
  - mTLS
  - Traefik
  - Nginx
  - PoP
  - sender-binding
  - CRUD Service
  - EmpowerNow
---

### What you’ll enable

- Inbound mTLS at the edge with CA verification.
- Forward the verified client certificate as a trusted header to CRUD Service.
- Optional/required sender-binding (PoP) between JWT `cnf.x5t#S256` and the client cert thumbprint.
- Certificate-to-identity mapping into canonical ARNs.

See background and design details in Reference → mTLS (Design & Guide).

### Prerequisites

- Traefik or Nginx ingress in front of CRUD Service.
- A CA certificate to validate client certificates.
- Ability to mount/update Traefik dynamic config or Nginx Ingress annotations.

### Dev (Docker + Traefik)

1) Traefik dynamic config: add mTLS and pass the client certificate

```yaml
# traefik/dynamic.yml
tls:
  options:
    mtls:
      minVersion: VersionTLS12
      clientAuth:
        clientAuthType: RequireAndVerifyClientCert
        caFiles:
          - /certs/ca.crt

http:
  middlewares:
    strip-external-client-cert:
      headers:
        removeRequestHeaders:
          - X-Forwarded-Tls-Client-Cert
          - X-Forwarded-Client-Cert
          - X-Forwarded-Client-Cert-Chain
          - X-Forwarded-Tls-Client-Cert-Signature
          - XFCC
    mtls-passcert:
      passTLSClientCert:
        pem: true
        info:
          subject: true
          issuer: true
          notBefore: true
          notAfter: true
          sans: true
```

2) Attach to CRUD router (labels in compose)

```yaml
- "traefik.http.routers.crud.tls=true"
- "traefik.http.routers.crud.tls.options=mtls@file"
- "traefik.http.routers.crud.middlewares=strip-external-client-cert@file,mtls-passcert@file,security-headers@file,rate-limit@file"
```

3) App settings (env or `/app/config`)

```env
INBOUND_AUTH_MODE=bearer_plus_mtls_optional
BINDING_REQUIRED_PATHS=/workflow/start,/workflow/resume,/execute
FORWARDED_CLIENT_CERT_HEADER=X-Forwarded-Tls-Client-Cert
TRUSTED_PROXY_CIDRS=172.16.0.0/12,10.0.0.0/8
CERT_IDENTITY_MAPPINGS=/app/config/cert_identity_mappings.yaml
```

4) Restart Traefik and CRUD Service; verify Traefik dashboard shows mTLS enabled for `crud` router.

5) Verify with curl

```bash
curl -sS https://crud.local/health \
  --cert client.pem --key client.key

curl -sS https://crud.local/execute \
  --cert client.pem --key client.key \
  -H "Authorization: Bearer $JWT" \
  -d '{"action":"ping","system":"demo","object_type":"user"}'
```

Expected:
- Optional mode: non-listed paths accept bearer-only; listed paths enforce PoP.
- Required mode (`bearer_plus_mtls_required`): missing cert or PoP mismatch → 401.

### Prod (Kubernetes)

Option A: Traefik (CRDs)

```yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
spec:
  entryPoints: [ websecure ]
  routes:
    - match: Host(`crud.prod.example.com`)
      kind: Rule
      services:
        - name: crud-service
          port: 8000
      middlewares:
        - name: mtls-passcert
  tls:
    options:
      name: mtls
      namespace: traefik
```

Option B: Nginx Ingress

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/auth-tls-verify-client: "on"
    nginx.ingress.kubernetes.io/auth-tls-secret: "default/mtls-ca"
    nginx.ingress.kubernetes.io/auth-tls-pass-certificate-to-upstream: "true"
```

App header name for Nginx: set `FORWARDED_CLIENT_CERT_HEADER=ssl-client-cert`.

### Quick visual

```mermaid
flowchart TD
  A["Client with cert + JWT"] --> B["Ingress (verify client cert)"]
  B --> C["Forward verified cert header"]
  C --> D["CRUD Service: parse cert, compute x5t"]
  D --> E{ "PoP required?" }
  E -->|"yes"| F{ "JWT.cnf.x5t == cert x5t?" }
  F -->|"yes"| G["Allow"]
  F -->|"no"| H["401 sender_binding_mismatch"]
  E -->|"no"| G
```

### Troubleshooting

- 401 `certificate_missing`: ingress not forwarding cert or wrong header name.
- 401 `sender_binding_mismatch`: JWT `cnf.x5t#S256` doesn’t match cert thumbprint.
- 400 on PEM parse: oversized/malformed header; check proxy and header limits.
- Verify Traefik `tls.options.mtls` in dashboard; check app logs for `mtls_thumbprint_present=true`.

### Observability

- Metrics: `mtls_auth_success_total`, `mtls_auth_failure_total{reason}`, `mtls_pop_mismatch_total`.
- Kafka audit: success/failure with minimal, non-sensitive data (thumbprint only).

### Related

- Reference → mTLS (Design & Guide)


