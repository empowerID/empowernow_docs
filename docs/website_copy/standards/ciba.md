# What is CIBA?

Client Initiated Backchannel Authentication (CIBA) is an OIDC flow where authentication happens without a front-channel redirect, suitable for devices or flows where the user interacts on a separate device.

## Why it matters
- Decoupled login for constrained devices or out-of-band approval

## How it works (high-level)
- Client initiates auth with an identifier
- OP/AS interacts with the user on a separate channel
- Client polls or receives a ping with the result, then obtains tokens

## Key terms
- backchannel auth request, auth_req_id, ping/poll modes

## Common pitfalls
- Timeouts and UX clarity; correlating the out-of-band user approval

## Next steps
- OAuth/OIDC refreshers: `website_copy/standards/oidc.md`, `website_copy/standards/oauth.md`
