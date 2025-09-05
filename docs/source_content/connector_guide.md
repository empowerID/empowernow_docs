## Connector developer guide

This guide covers building and configuring VDS connectors, the shared adapter layer, and example configs for LDAP, REST, SCIM, ODBC, and Azure Graph.

See also: [Virtualization Phase 2 — Data Shaping, Merging, and Projection](./virtualization_phase2.md).

### Architecture

- Provider interface: `vds.connectors.base.Provider` exposes `async search(query: ProviderQuery) -> (rows, next_cursor)`.
- Row shape: `{ subject: str, id: str }`, ordered by `(subject.casefold, id)`.
- Registry: `vds.connectors.registry.ProviderRegistry` maps types (ldap, rest, scim, odbc, azure) to provider classes; can build from a systems YAML.
- Secrets: `EnvSecretsProvider` by default; `VaultSecretsProvider` optionally reads HashiCorp Vault KV v2.
- Adapter: `vds.connectors.adapter` provides `map_exception`, templating helpers (`render_endpoint`, `render_body_or_params`), and a `SecretsFacade`.
- Observability: `vds.observability.tracing.span` emits timing; `vds.observability.metrics.metrics` records provider latency and retry counters.

### Common configuration

All providers accept a CRUD-like shape:

```yaml
server: { base_url: "...", token_url: "...", use_ssl: false }
credentials: { client_id: "...", client_secret: "...", bearer_token: "..." }
mapping: { subject_attr: "...", id_attr: "..." }
retry: { max_attempts: 3, backoff_base: 0.2, backoff_factor: 2.0 }
```

### LDAP

- Options: `server.base_url`, `server.port`, `server.use_ssl`, `server.base_dn`.
- Credentials: `credentials.username`, `credentials.password`.
- Advanced: `alias_deref: never|searching|finding|always`, `referrals: true|false`, `sort_keys: ["cn", "sn"]`, `vlv: {before: 0, after: 49}`.
- Pooling: `pool: { min: 0, max: 4 }` and optional `client_factory` for tests.

```yaml
type: ldap
server: { base_url: addomain, port: 636, use_ssl: true, base_dn: "DC=addomain,DC=com" }
credentials: { username: "addomain\\svc", password: "..." }
mapping: { subject_attr: sAMAccountName, id_attr: objectGUID }
alias_deref: always
referrals: true
sort_keys: ["sAMAccountName"]
vlv: { before: 0, after: 199 }
pool: { min: 0, max: 4 }
```

### REST

- Token: optional client-credentials flow using `server.token_url` + `credentials.client_id/secret/audience`.
- Retries: respects `Retry-After` and vendor variants.
- Actions: `perform_action` with templated `endpoint`, `params`, `body`, header overrides, expected outcomes, and pagination extraction.

```yaml
type: rest
server: { base_url: "https://api" , token_url: "https://auth/oauth/token" }
credentials: { client_id: "...", client_secret: "...", audience: "https://api" }
mapping: { subject_attr: email, id_attr: user_id }
```

### SCIM 2.0

- Bearer token header or OAuth.
- Paging: `startIndex`/`count`; filter passthrough for simple `eq` mapping.

```yaml
type: scim
server: { base_url: "https://scim.example/v2" }
credentials: { bearer_token: "..." }
mapping: { subject_attr: userName, id_attr: id }
```

### ODBC/SQL

- DSN: `dsn` or engine URL; tests can use `rows` for in-memory mode.
- Ordering: always by `lower(subject), id`.

```yaml
type: odbc
dsn: "Driver=ODBC Driver 18 for SQL Server;Server=tcp:db,1433;Database=app;..."
subject_column: subject
id_column: id
```

### Azure Graph

- Base URL default: `https://graph.microsoft.com/v1.0`.
- Token: AAD v2.0 client credentials with `scope: https://graph.microsoft.com/.default`.
- Features: `$batch`, `@odata.nextLink`, optional `delta` flow.

```yaml
type: azure
server: { base_url: "https://graph.microsoft.com/v1.0", token_url: "https://login.microsoftonline.com/<tenant>/oauth2/v2.0/token" }
credentials: { client_id: "...", client_secret: "...", scope: "https://graph.microsoft.com/.default" }
mapping: { subject_attr: userPrincipalName, id_attr: id }
delta: true
```

### Systems registry example

You can define systems in a YAML and build the registry using `ProviderRegistry.from_systems_config(...)`.

```yaml
systems:
  addomain:
    type: ldap
    config:
      server: { base_url: addomain, port: 636, use_ssl: true, base_dn: "DC=addomain,DC=com" }
      credentials: { username: "addomain\\svc", password: "..." }
      mapping: { subject_attr: sAMAccountName, id_attr: objectGUID }
  auth_api:
    type: rest
    config:
      server: { base_url: "https://api", token_url: "https://auth/oauth/token" }
      credentials: { client_id: "id", client_secret: "secret", audience: "https://api" }
  scim_dir:
    type: scim
    config:
      server: { base_url: "https://scim.example/v2" }
      credentials: { bearer_token: "t" }
  hr_db:
    type: odbc
    config:
      dsn: "Driver=ODBC Driver;Server=db;Database=app;..."
  azure_tenant:
    type: azure
    config:
      server: { base_url: "https://graph.microsoft.com/v1.0" }
      credentials: { client_id: "id", client_secret: "secret" }
```

### Secrets

- Default: `EnvSecretsProvider` reads environment variables.
- Optional: `VaultSecretsProvider` (HashiCorp KV v2): `base_url`, `token`, `mount`.
- Secret names may include `#key` selector, e.g. `app/db#password`.

### Observability

- Spans: `provider.*`, `aggregator.*`, `mapping.*` emit timing.
- Metrics: provider latency list, provider retry counter, aggregator/mapping latency, cookie oversize, config reload, mapping version.


