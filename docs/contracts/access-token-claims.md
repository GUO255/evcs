# Platform Access-Token Contract

This is the language-neutral contract between the Platform Authentication Domain and resource servers. The machine-readable authority is [access-token-claims.schema.json](access-token-claims.schema.json). Its `examples[0]` value is the tested documentation fixture; it is illustrative and is not a live credential.

## Format and claims

Accept only a three-segment signed JWT whose protected header has a non-empty `kid` and `alg` exactly `EdDSA`. Reject opaque tokens, `alg: none`, missing `kid`, and every other algorithm.

The following claims are required:

| Claim | Required value or rule |
| --- | --- |
| `iss` | exact configured `PLATFORM_AUTH_ISSUER`；production must be an HTTPS origin followed by `/platform` |
| `sub` | non-empty Platform Authentication Domain user ID; not a universal person ID |
| `aud` | exact string `platform-service`, or the exact two-member set `platform-service` plus `${iss}/oauth2/userinfo` for an OpenID request |
| `azp` | exact string `platform-web-bff` |
| `scope` | space-delimited OAuth scope string; the current BFF user-token contract is exactly `platform:read site-selection:read site-selection:write offline_access` |
| `auth_domain` | exact string `platform` |
| `iat` | integer NumericDate |
| `exp` | integer NumericDate later than `iat` and not expired |

Better Auth 1.6.25 accepts one token-endpoint resource string and adds its userinfo endpoint as a second Access Token audience when the authorization request includes `openid`. Platform Service and Site Selection V2 are first-party services in the same Platform API resource boundary; both require `platform-service` and accept no secondary audience other than the exact issuer userinfo endpoint. They enforce their own route scopes.

Only the confidential Platform Web BFF may obtain and forward this user Access Token. Browsers send an opaque HttpOnly Session Cookie to same-origin BFF routes and must never receive, persist, decode, refresh, or attach the JWT themselves. Resource servers accept only `azp=platform-web-bff`; there is no simultaneous legacy `platform-web` acceptance window.

Authentication account roles, permissions, business roles, and business data scope are intentionally excluded. Better Auth `role=user` is only an ordinary authentication account category, not a Platform business role or grant. A frontend may use successful authentication to establish a session experience, but it must not grant business capabilities from decoded token contents. Platform Service resolves the active `platform_member`, roles, and permissions online from its own `platform_*` tables keyed by `sub`; request paths never query `auth_platform_*`.

Permission and role changes therefore take effect on the next Platform Service API request and never require a replacement Access Token. `GET /api/me` requires an active business member and returns the verified authentication facts plus the business member, roles, and sorted permission codes. It intentionally returns no phone number. Missing or disabled business members receive `403 business_access_denied` even when the Access Token is otherwise valid.

## Verification procedure

For every request, a Go, Bun, or other resource server must perform local cryptographic verification:

1. Parse only compact JWT syntax and read `kid` without trusting claims.
2. Resolve `kid` from the configured `PLATFORM_AUTH_JWKS_URL` (the issuer URL followed by `/jwks`) and verify EdDSA with that key.
3. If a cached JWKS has no matching `kid`, refresh it once immediately and retry. If the refreshed set still has no key, reject the token; do not repeatedly fetch for the same request.
4. Validate exact `iss`, the strict audience form above, `azp`, and `auth_domain`; require the endpoint's scope; require `sub`, `iat`, and `exp`.
5. Permit at most 60 seconds of clock skew for time validation. Reject `exp <= iat` and tokens outside the accepted time window.

Cache JWKS according to HTTP cache metadata where available and use a bounded local cache. An unknown-`kid` refresh is the rotation path, not permission to skip signature or claim validation. Resource servers must not call the auth database or join authentication tables during validation.

In Bun, use a JOSE verifier configured with `algorithms: ["EdDSA"]`, exact issuer, and required Platform resource audience, then reject every audience set except the two forms above before applying schema/domain/scope/time checks. In Go, use a maintained JWT/JWK library with an explicit EdDSA allow-list and the same checks; do not rely on parsing alone or on a library's algorithm inference.

## Revocation and rotation semantics

Access Tokens are self-contained and validated locally. Disabling an Auth account deletes its stored OAuth Access Token, Refresh Token, and Better Auth Session rows, but cannot erase a JWT already delivered to a client. That JWT remains cryptographically valid until its own `exp` (15 minutes by default, with at most 60 seconds of verifier skew). This does not preserve Platform business access: every Platform Service API request performs an online business-member lookup, so a missing or disabled `platform_member` fails authorization immediately.

With `AUTH_PLATFORM_LOGIN_TTL_SECONDS=2592000`, Refresh Tokens and authentication sessions have a fixed 30-day absolute limit. Refresh authorization checks both the credential's stored expiry and the original `auth_time + AUTH_PLATFORM_LOGIN_TTL_SECONDS`; session reuse checks its stored expiry and `session.created_at + AUTH_PLATFORM_LOGIN_TTL_SECONDS`. Session refresh is disabled, and rotating a Refresh Token does not extend the original authentication deadline. After the deadline, refresh and session reuse fail and the user must authenticate again with OTP.

Signing keys rotate every 30 days by default. Retired public keys remain in JWKS for a 24-hour grace period so valid short-lived tokens remain verifiable. Private key rows are encrypted at rest by the Better Auth JWT plugin. After grace the old public key is no longer published, but Better Auth 1.6.23 retains the encrypted database row and provides no official cleanup API.
