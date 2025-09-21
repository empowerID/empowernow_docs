# What is FAPI 2.0?

Financial-grade API (FAPI) 2.0 is a set of security and interoperability profiles for high-assurance OAuth/OIDC deployments.

## Why it matters
- Raises the security baseline (e.g., PAR/JARM usage, strict client profiles)
- Interoperability for regulated ecosystems

## How it works (high-level)
- Builds on OAuth 2.0/OIDC with additional requirements like:
  - PAR for pushed requests
  - JARM for JWT-secured authorization responses
  - PKCE, strict redirect URI handling, MTLS/DPoP (profile-dependent)

## Key terms
- Baseline, Security profile, PAR, JARM, PKCE, MTLS/DPoP

## Common pitfalls
- Mixing front-channel params with PAR; skipping JARM/JWS verification

## Next steps
- Switches and hardening: `services/bff/how-to/fapi-switches.md`
- ForwardAuth reference: `services/bff/reference/traefik-forwardauth.md`
- OAuth/OIDC refreshers: `website_copy/standards/oauth.md`, `website_copy/standards/oidc.md`
