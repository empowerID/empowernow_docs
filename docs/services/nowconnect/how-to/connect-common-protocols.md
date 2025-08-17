## Connect Common Protocols (SSH, Telnet, LDAP/AD, ODBC, HTTP/S)

### TL;DR
- **Cloud**: define TCP listeners per protocol/port and expose those ports.
- **Premise**: map each listener’s connector name to an on‑prem `host:port` via env.
- Nothing else to code; the tunnel is raw TCP.

### Cloud (bind external ports → connector names)
Add to `ServiceConfigs/NowConnect/config/cloud.yaml`:

```yaml
listeners:
  # SSH / Telnet
  - { name: ssh,      bind: "0.0.0.0:22",    connector: "ssh" }
  - { name: telnet,   bind: "0.0.0.0:23",    connector: "telnet" }

  # LDAP / AD (Directory + Global Catalog + Kerberos)
  - { name: ldap,     bind: "0.0.0.0:389",   connector: "ldap" }
  - { name: ldaps,    bind: "0.0.0.0:636",   connector: "ldaps" }
  - { name: gc,       bind: "0.0.0.0:3268",  connector: "gc" }
  - { name: gcssl,    bind: "0.0.0.0:3269",  connector: "gcssl" }
  - { name: krb,      bind: "0.0.0.0:88",    connector: "krb" }   # optional, AD auth

  # ODBC (examples)
  - { name: mssql,    bind: "0.0.0.0:1433",  connector: "mssql" }
  - { name: oracle,   bind: "0.0.0.0:1521",  connector: "oracle" }
  - { name: postgres, bind: "0.0.0.0:5432",  connector: "pg" }
  - { name: mysql,    bind: "0.0.0.0:3306",  connector: "mysql" }

  # REST backends on-prem
  - { name: http,     bind: "0.0.0.0:18080", connector: "http" }
  - { name: https,    bind: "0.0.0.0:18443", connector: "https" }
```

Expose these ports from the Cloud deployment:
- Docker Compose: add `ports` for each bound port.
- Kubernetes: create a Service with matching `ports` (one multi‑port Service or per‑connector Services). Optionally front `http/https` with an Ingress or a TCP router.

### Premise (map connector names → on‑prem hosts)
In the agent env (e.g., `nowconnect/premise/nowconnect.env.example`), set:

```env
NC_CONNECTORS=ssh,telnet,ldap,ldaps,gc,gcssl,krb,mssql,oracle,pg,mysql,http,https

# SSH/Telnet
NC_TARGET_ssh_HOST=10.0.0.10
NC_TARGET_ssh_PORT=22
NC_TARGET_telnet_HOST=10.0.0.11
NC_TARGET_telnet_PORT=23

# LDAP/AD
NC_TARGET_ldap_HOST=ad01.corp.local
NC_TARGET_ldap_PORT=389
NC_TARGET_ldaps_HOST=ad01.corp.local
NC_TARGET_ldaps_PORT=636
NC_TARGET_gc_HOST=ad01.corp.local
NC_TARGET_gc_PORT=3268
NC_TARGET_gcssl_HOST=ad01.corp.local
NC_TARGET_gcssl_PORT=3269
NC_TARGET_krb_HOST=ad01.corp.local
NC_TARGET_krb_PORT=88

# ODBC (examples)
NC_TARGET_mssql_HOST=sql01.corp.local
NC_TARGET_mssql_PORT=1433
NC_TARGET_oracle_HOST=ora01.corp.local
NC_TARGET_oracle_PORT=1521
NC_TARGET_pg_HOST=pg01.corp.local
NC_TARGET_pg_PORT=5432
NC_TARGET_mysql_HOST=db01.corp.local
NC_TARGET_mysql_PORT=3306

# REST
NC_TARGET_http_HOST=api-internal.corp.local
NC_TARGET_http_PORT=80
NC_TARGET_https_HOST=api-internal.corp.local
NC_TARGET_https_PORT=443
```

### Test quickly
- SSH: `ssh -p 22 <user>@<cloud-host>` (should reach on‑prem target)
- Telnet: `telnet <cloud-host> 23`
- LDAP: `ldapsearch -H ldap://<cloud-host>:389 -x -b "dc=corp,dc=local"`
- LDAPS: `ldapsearch -H ldaps://<cloud-host>:636 ...`
- MSSQL: `sqlcmd -S <cloud-host>,1433 -U ...`
- Postgres: `psql -h <cloud-host> -p 5432 ...`
- REST: `curl http://<cloud-host>:18080/health` or `curl https://<cloud-host>:18443/...`

### Notes and guardrails
- TLS stays end‑to‑end (LDAPS/HTTPS/Oracle TCPS); no termination in the tunnel.
- For AD, the most common needs are 389/636/3268/3269 and sometimes 88 (Kerberos over TCP). Avoid tunneling SMB/RPC port ranges unless absolutely required.
- Ensure the Cloud environment actually opens the ports you bind (LB/Service/Ingress).
- Premise agent must have network reachability to each on‑prem target host:port.
- Logs/health are already implemented; no extra code needed.

