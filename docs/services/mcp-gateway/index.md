---
id: index
title: ARIA MCP Gateway — Client+Server Authorization Proxy
description: The centralized MCP Client+Server that proxies all MCP traffic with advanced OAuth OBO/RAR authentication and OpenID AuthZEN authorization.
---

## What it is

The ARIA MCP Gateway is a dual‑role MCP Client and MCP Server that sits in front of all MCP traffic. It connects to upstream MCP Servers (e.g., CRUDService Loopback MCP and vendor MCPs) as a client, and republishes a governed MCP endpoint as a server so agents and UIs talk to a single, secured entry point. It is part of the ARIA Shield product family.

## Responsibilities

- Catalog aggregation: fetch and normalize `tools/list` from configured upstream MCP Servers; publish a consolidated catalog (supports large catalogs with scoped, virtual servers/views).
- Invocation proxy: route `tools/call` to the correct upstream; preserve IDs/correlation and response shape.
- Authentication: perform OAuth On‑Behalf‑Of/Token Exchange to mint audience‑bound upstream tokens; carry Rich Authorization Requests (RAR); optionally require DPoP.
- Authorization: call the OpenID AuthZEN PDP for every `tools/call` (single/batch). Subject = delegated agent; Resource = tool; Context = RAR details and runtime attributes. PDP returns boolean only.
- Observability & audit: emit decision metrics and business logs; correlate requests; forward or deny with concise reasons.

## Why it exists (and what it is not)

- The ARIA MCP Gateway is the central choke point for MCP authN/Z. All MCP JSON‑RPC/REST must pass through it in production.
- It is not a tool catalog generator. CRUDService Loopback MCP generates the no‑code tool catalogs and exposes `/mcp/*` endpoints; the Gateway authorizes and proxies access to them.
- It is not ARIA Shield (formerly BFF). Human traffic (SPAs) and provider streaming/budgets use ARIA Shield; agent MCP traffic uses the MCP Gateway.

## Architecture (high level)

```mermaid
flowchart LR
  subgraph Clients
    AG[Agents / UIs]
  end
  subgraph Gateway
    GW[MCP Gateway<br/>(MCP Client+Server)]
  end
  subgraph Upstream MCP Servers
    CRUD[CRUDService Loopback MCP]
    V1[Vendor MCP #1]
    V2[Vendor MCP #2]
  end
  subgraph Control Plane
    IDP[IdP (OBO / Token Exchange / RAR / DPoP)]
    PDP[PDP (OpenID AuthZEN)]
  end

  AG --> GW
  GW --> CRUD
  GW --> V1
  GW --> V2
  GW --> IDP
  GW --> PDP
```

## Production guidance

- Configure agents/UIs to call the ARIA MCP Gateway endpoint only. Do not expose CRUDService `/mcp/*` directly to external clients.
- Keep Loopback MCP enabled on CRUDService to generate tools; register those upstreams in the Gateway configuration.
- Treat ARIA Shield and ARIA MCP Gateway as complementary: ARIA Shield for SPA routes and provider streaming/budgets; MCP Gateway for agent MCP routes.

## See also

- CRUDService — Loopback MCP (no‑code tool catalogs)
- ARIA Shield — Provider Proxy and MCP Gateway product family (agent and provider traffic)




