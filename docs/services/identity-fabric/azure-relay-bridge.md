---
id: azure-relay-bridge
title: Azure Relay Bridge (azbridge) – Hybrid Connectivity
description: How to use Azure Relay Bridge (azbridge) to securely connect cloud/container services to on‑premises LDAP/Active Directory and other services without opening inbound firewall ports.
---

## Overview

The Azure Relay Bridge (`azbridge`) enables secure, seamless connectivity between containerized/cloud services and on‑premises resources (such as Active Directory Domain Controllers) without opening inbound firewall ports. In this setup, multiple `azbridge` containers can be used to connect to different on‑premises endpoints:

- **addomain**: Bridges to `addomain.com` (LDAP on port 389)
- **devdomain1**: Bridges to `devdomain1.com` (LDAPS on port 636)
- **sapldapvds**: Bridges to SAP LDAP service (LDAP on port 400)

Any service on the same Docker network (for example, `crud-service`) can connect to these bridges as if the targets were local. Traffic is securely relayed via Azure Relay.

## How it works

1. Azure Relay Bridge containers connect outbound to Azure Relay using connection strings.
2. Each bridge exposes a local port (via `-L`) inside the Docker network and forwards to the remote on‑premises host/port through Azure Relay.
3. Other containers resolve the bridge container names via Docker DNS and connect as if the service were local.

## Architecture

```mermaid
graph TD
    subgraph Docker Network
        CRUD[crud-service]
        ADDOMAIN[addomain (azbridge)]
        DEVDOMAIN[devdomain1 (azbridge)]
        SAPLDAP[sapldapvds (azbridge)]
    end
    subgraph Azure Relay
        RELAY1[Azure Relay - addomain.com]
        RELAY2[Azure Relay - devdomain1.com]
        RELAY3[Azure Relay - sapldapvds]
    end
    subgraph On-Premises
        DC1[addomain.com (DC)]
        DC2[devdomain1.com (DC)]
        SAP[SAP LDAP Service]
    end

    CRUD -- LDAP (389) --> ADDOMAIN
    CRUD -- LDAPS (636) --> DEVDOMAIN
    CRUD -- LDAP (400) --> SAPLDAP
    ADDOMAIN -- Azure Relay ConnStr --> RELAY1
    DEVDOMAIN -- Azure Relay ConnStr --> RELAY2
    SAPLDAP -- Azure Relay ConnStr --> RELAY3
    RELAY1 -- Secure Tunnel --> DC1
    RELAY2 -- Secure Tunnel --> DC2
    RELAY3 -- Secure Tunnel --> SAP
```

## Step-by-step flow

1. Startup: Each `azbridge` container establishes a secure outbound connection to Azure Relay using its connection string.
2. Port forwarding: `-L` exposes a local port (e.g., `389`, `636`, `400`) inside the Docker network.
3. Service discovery: Peers resolve `addomain`, `devdomain1`, and `sapldapvds` via Docker DNS.
4. Requests: Clients send LDAP/LDAPS to the bridge endpoints.
5. Relay forwarding: `azbridge` forwards through Azure Relay to the on‑prem target.
6. Response: The on‑prem service responds through the same path back to the client.

## Example consumption

### Connection URIs
- To connect to `addomain.com` (LDAP): `ldap://addomain:389`
- To connect to `devdomain1.com` (LDAPS): `ldaps://devdomain1:636`
- To connect to SAP LDAP service: `ldap://sapldapvds:400`

### Quick connectivity checks

```bash
# LDAP (addomain)
ldapsearch -x -H ldap://addomain:389 -s base -b "" "(objectclass=*)"

# LDAPS (devdomain1)
ldapsearch -x -H ldaps://devdomain1:636 -s base -b "" "(objectclass=*)"

# SAP LDAP
ldapsearch -x -H ldap://sapldapvds:400 -s base -b "" "(objectclass=*)"
```

### Docker Compose example

```yaml
services:
  addomain:
    image: azure-relay-bridge
    command: ["-L", "0.0.0.0:389:addomain.com:389", "-c", "${ADDOMAIN_CONNECTION_STRING}"]
    environment:
      - ADDOMAIN_CONNECTION_STRING=${ADDOMAIN_CONNECTION_STRING}
    networks:
      - crud-network

  devdomain1:
    image: azure-relay-bridge
    command: ["-L", "0.0.0.0:636:devdomain1.com:636", "-c", "${DEVDOMAIN1_CONNECTION_STRING}"]
    environment:
      - DEVDOMAIN1_CONNECTION_STRING=${DEVDOMAIN1_CONNECTION_STRING}
    networks:
      - crud-network

  sapldapvds:
    image: azure-relay-bridge
    command: ["-L", "0.0.0.0:400:sapldapvds:400", "-c", "${SAPLDAP_CONNECTION_STRING}"]
    environment:
      - SAPLDAP_CONNECTION_STRING=${SAPLDAP_CONNECTION_STRING}
    networks:
      - crud-network

networks:
  crud-network:
    driver: bridge
```

### Image and flags used in EmpowerNow compose

If you are using the EmpowerNow image and compose in `CRUDService/docker-compose-authzen4.yml`, the bridge services look like this:

```yaml
addomain:
  image: eidrelease.azurecr.io/azure-relay-bridge:0.15.0
  command:
    - -L
    - 0.0.0.0:389:addomain.com:389
    - -x   # internal image flag for connection string
    - "$AZBRIDGE_RELAY_ADDOMAIN_CONNSTR"
  networks:
    - app-network

devdomain1:
  image: eidrelease.azurecr.io/azure-relay-bridge:0.15.0
  command:
    - -L
    - 0.0.0.0:636:devdomain1.com:636
    - -x
    - "$AZBRIDGE_RELAY_DEVDOMAIN1_CONNSTR"
  networks:
    - app-network

sapldapvds:
  image: eidrelease.azurecr.io/azure-relay-bridge:0.15.0
  command:
    - -L
    - 0.0.0.0:400:sapldapvds:400
    - -x
    - "$AZBRIDGE_RELAY_SAPLDAPVDS_CONNSTR"
  networks:
    - app-network
```

Notes:
- Some upstream images use `-c` for the connection string flag; the EmpowerNow image uses `-x`.
- Always include the remote port explicitly (e.g., `...:addomain.com:389`) for clarity across variants.
- Keep bridge containers on the same Docker network as consumers (for example, `crud-service`).

See also the integrated stack example in `CRUDService/docker-compose-authzen4.yml`.

## Security notes

- No inbound firewall ports are required on the on‑premises network.
- All traffic is encrypted and authenticated via Azure Relay; prefer LDAPS (636) where applicable.
- Store connection strings in a secure secrets store and rotate regularly.

## Troubleshooting

1. Connection refused: Ensure the `azbridge` container is healthy and the connection string is valid.
2. Authentication failures: Verify Azure Relay namespace/authorization and the specific listener/relay configuration.
3. Port conflicts: Confirm no other service binds the same ports within the Docker network.

## Related

- Identity Fabric overview: `services/identity-fabric/index`
- CRUD Service: `services/crud-service/index`
- BFF: `services/bff/index`

## References

- Azure Relay documentation: `https://learn.microsoft.com/en-us/azure/azure-relay/`
- Azure Relay Bridge GitHub: `https://github.com/Azure/azure-relay-bridge`
- LDAP search reference: `https://ldap.com/ldapsearch/`


