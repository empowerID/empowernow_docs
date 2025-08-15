---
id: connect-to-onprem-ldap-via-azrelay
title: Connect CRUD Service to On‑Prem LDAP via Azure Relay Bridge
description: How to configure CRUD Service to talk to on‑prem LDAP/AD using Azure Relay Bridge (azbridge) without opening inbound firewall ports.
---

## When to use this

Use this guide when CRUD workflows must perform LDAP/LDAPS operations against on‑premises directories (for example, corporate AD or SAP LDAP) and direct network connectivity is not available.

## Prerequisites

- Azure Relay namespace and hybrid connection(s) set up; connection strings issued
- `azure-relay-bridge` container images accessible
- CRUD and bridge containers share a Docker network

## Steps

1. Deploy bridge containers as peers in the CRUD network. See: `services/identity-fabric/azure-relay-bridge` for the full Compose example.
2. Set CRUD configuration to point to the bridge endpoints:

```env
LDAP_URI=ldap://addomain:389
LDAPS_URI=ldaps://devdomain1:636
SAP_LDAP_URI=ldap://sapldapvds:400
```

3. Validate connectivity from the CRUD pod/container:

```bash
ldapsearch -x -H "$LDAP_URI" -s base -b "" "(objectclass=*)"
ldapsearch -x -H "$LDAPS_URI" -s base -b "" "(objectclass=*)"
```

## Security

- Prefer LDAPS where supported.
- Store and rotate connection strings using your secrets manager.

## See also

- Azure Relay Bridge: `services/identity-fabric/azure-relay-bridge`
- CRUD Service security: `services/crud-service/explanation/security`


