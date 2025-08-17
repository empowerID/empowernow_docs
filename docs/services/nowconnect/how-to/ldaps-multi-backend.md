## LDAPS: Multiple Backends (one listener per backend)

### Yes — define one cloud listener per LDAPS backend; premise dials each target on 636
You’ll give each backend its own connector and its own cloud listener port. The premise agent exports those connectors and maps each to the correct on‑prem host:636. No code changes are needed.

### Cloud config (one port per backend → unique connector names)
Add per‑backend listeners in `ServiceConfigs/NowConnect/config/cloud.yaml`. Example for 3 servers; scale to 10.

```yaml
# ServiceConfigs/NowConnect/config/cloud.yaml
listeners:
  - { name: ldaps_dc1, bind: "0.0.0.0:6361", connector: "ldaps_dc1" }
  - { name: ldaps_dc2, bind: "0.0.0.0:6362", connector: "ldaps_dc2" }
  - { name: ldaps_dc3, bind: "0.0.0.0:6363", connector: "ldaps_dc3" }

# other cloud settings unchanged...
```

- Docker/compose: expose 6361..636N on the cloud container.
- Kubernetes: create a Service exposing 6361..636N (one Service with multiple ports or one per listener).

Example k8s Service (multi‑port):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nowconnect-cloud-tcp
spec:
  selector: { app: nowconnect-cloud }
  type: LoadBalancer
  ports:
    - { name: ldaps-dc1, port: 6361, targetPort: 6361 }
    - { name: ldaps-dc2, port: 6362, targetPort: 6362 }
    - { name: ldaps-dc3, port: 6363, targetPort: 6363 }
```

### Premise config (all backends use port 636 locally)
Export the same connectors and map them to each on‑prem LDAPS host at port 636:

```env
# nowconnect/premise/nowconnect.env
NC_CONNECTORS=ldaps_dc1,ldaps_dc2,ldaps_dc3

NC_TARGET_ldaps_dc1_HOST=dc1.corp.local
NC_TARGET_ldaps_dc1_PORT=636

NC_TARGET_ldaps_dc2_HOST=dc2.corp.local
NC_TARGET_ldaps_dc2_PORT=636

NC_TARGET_ldaps_dc3_HOST=dc3.corp.local
NC_TARGET_ldaps_dc3_PORT=636
```

### Client/system configuration
Point your client or consuming service to the cloud host and the listener port for the desired backend. Example adapting `CRUDService/config/systems/av_openldap.yaml` to use `ldaps_dc2` via port 6362:

```yaml
connection:
  credentials:
    username: "cn=admin,dc=example,dc=org"
    password: "${{ENV:LDAP_ADMIN_PASSWORD}}"
  server:
    base_url: "nowconnect-cloud"   # if same Docker network: use cloud service name
    # or use your LB DNS/IP, e.g. "nc-cloud.example.com"
    port: 6362                     # maps to connector ldaps_dc2 on the cloud
    use_ssl: true                  # LDAPS
  base_dn: "dc=example,dc=org"
```

If running in Kubernetes, use the Service DNS name of the cloud component plus the listener port, e.g. `nowconnect-cloud-tcp.nowconnect.svc.cluster.local:6362`.

### How the flow works
- Client connects to the cloud on the listener port (e.g., 6362).
- Cloud listener for 6362 is configured with `connector: "ldaps_dc2"`.
- Cloud sends `OPEN{connector:"ldaps_dc2"}` over the WS tunnel to the agent.
- Premise agent looks up `ldaps_dc2` in its target map and dials `dc2.corp.local:636`.
- Bytes move both ways (DATA frames). FIN/RST close semantics are handled.
- TLS remains end‑to‑end between the client and `dc2.corp.local` (the tunnel doesn’t terminate TLS).

### Important note on TLS certificates (LDAPS)
- The server certificate presented is for `dcX.corp.local`. If clients connect using the cloud’s hostname, strict hostname verification may fail.
- Recommended mitigations:
  - Client uses the backend FQDN in its connection string (e.g., `ldaps://dc2.corp.local:6362`), with DNS for `dc2.corp.local` pointing to the cloud LB IP. Hostname matches the cert; non‑standard port is fine.
  - Or assign separate load balancer IPs/DNS names per backend so clients can still use port 636.
  - Avoid disabling certificate verification where possible.

### Summary of what to configure
- **Cloud**:
  - Add one listener per backend with unique bind port and unique `connector` name.
  - Expose those ports via your LB/Service.
- **Premise**:
  - Include all connector names in `NC_CONNECTORS`.
  - Map each `NC_TARGET_<connector>_HOST` to the correct on‑prem LDAPS server; `NC_TARGET_<connector>_PORT=636` for all.

This pattern generalizes to any TCP service (LDAP/LDAPS/ODBC/SSH/Telnet): unique cloud port per backend connector; premise always dials the real on‑prem port for that protocol.

