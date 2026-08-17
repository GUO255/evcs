# EVCS Auth Service Architecture

## Authentication domains

**Authentication Domain（认证域）is an EVCS term.** It is implemented as one independently configured Better Auth instance; it is not a Better Auth Realm or native multi-tenancy feature. Each domain owns its URL base path and issuer, login and registration policy, users, sessions, signing keys, and logical table namespace.

Four independent domains are planned: Platform, Merchant, Station Manager, and Driver. Only the Platform Authentication Domain is implemented. There is no universal user subject, shared user table, or cross-domain identity-link table. A person who later needs accounts in multiple domains has independent subjects unless an explicit verified linking requirement is designed.

`site-selection-web` authentication ownership is unresolved, so it is not registered as an auth client and is not assigned to any domain.

Better Auth's Admin plugin governs authentication accounts only: account status and authentication sessions. Its `user`, `auth-admin`, and `platform-owner` values are authentication account categories. In particular, Better Auth `role=user` means an ordinary account is eligible to authenticate; it is not a Platform business role or authorization grant. Business permissions, menus, merchant or station membership, and data scope remain in their owning business services. Frontends must not treat Admin data or token claims as business authorization.

## Implemented Platform boundary

The production issuer is `${AUTH_PUBLIC_URL}/platform`. The implemented protocol layout is:

| Purpose | Endpoint |
| --- | --- |
| Authorization server metadata | `${AUTH_PUBLIC_URL}/platform/.well-known/oauth-authorization-server` |
| Authorization | `${AUTH_PUBLIC_URL}/platform/oauth2/authorize` |
| Token | `${AUTH_PUBLIC_URL}/platform/oauth2/token` |
| Revocation | `${AUTH_PUBLIC_URL}/platform/oauth2/revoke` |
| UserInfo | `${AUTH_PUBLIC_URL}/platform/oauth2/userinfo` |
| Public signing keys | `${AUTH_PUBLIC_URL}/platform/jwks` |
| Phone OTP send / verify | `/platform/phone-number/send-otp`, `/platform/phone-number/verify` |

The only enabled Platform application client is the confidential `platform-web-bff`; the legacy public `platform-web` client is disabled after the confidential client is validated. The only resource is `platform-service`. Authorization Code with S256 PKCE is enabled. Dynamic client registration, email/password login, public sign-up, and Better Auth's generic token endpoint are disabled. Platform accounts must exist and be enabled before OTP login can succeed; unknown and disabled phone numbers receive the same public send response and never create accounts.

Platform Web does not implement OAuth. Its dedicated BFF owns state, nonce, PKCE verifier, confidential code exchange, refresh rotation, and revocation. The browser receives only an opaque HttpOnly Session Cookie and calls same-origin `/api/*` and `/gateway/*` routes. Access and Refresh Tokens are encrypted in external Redis; they never enter browser JavaScript, Web Storage, URLs, logs, or browser request headers. A gateway `401` invalidates the BFF Session and returns a manual-login state without automatically restarting authorization.

## Data ownership

The auth service owns the `auth_platform_*` tables and their schema model. Its Drizzle migration history is grouped under `ops/database/migrations/auth` and runs only through the repository-level locked migration command; migrations never run at service startup. Authentication tables contain auth accounts, sessions, OAuth state, JWKS rows, abuse counters, OTP challenges, provisioning state, and auth-governance audit events.

Platform Service owns `platform_role`, `platform_member`, `platform_role_permission`, `platform_member_role`, and the append-only `platform_authorization_audit_event`. It stores the Platform domain `auth_user_id` as the business member reference. Its request paths validate Access Tokens locally, use `sub`, and query only these service-owned, indexed tables; they never query or join `auth_platform_*`.

Every Platform Service `/api/*` request resolves the current active `platform_member` and current role permissions online. This makes business member disable and permission changes effective on the next request without putting roles or permissions in a JWT. Platform Web may use the returned permissions for presentation, but Platform Service remains the business authorization authority.

## Account provisioning and audit boundary

`POST /internal/platform/accounts` is a machine-only, exact-payload boundary for phone account provisioning. `POST /internal/platform/accounts/status` is the corresponding exact-payload boundary for enable and disable. They are served from the configured Auth Origin and remain outside the public `/platform` Better Auth base path.

Platform Service calls both endpoints using `PLATFORM_AUTH_INTERNAL_BASE_URL`, `PLATFORM_AUTH_INTERNAL_SECRET`, and the bounded `PLATFORM_AUTH_INTERNAL_TIMEOUT_MS` request timeout. In production, the internal base URL is a deployment-provided HTTPS Origin configured independently from the `PLATFORM_AUTH_ISSUER` Origin; the two Origins may be equal but need not be. Local development and tests use loopback HTTP. The bearer value must equal Auth Service's `AUTH_INTERNAL_PROVISIONING_SECRET`, which is at least 32 characters and must be pairwise different from `AUTH_BETTER_AUTH_SECRET`, `AUTH_RATE_LIMIT_SECRET`, and `AUTH_SMS_OUTBOX_ENCRYPTION_SECRET`. Checked-in examples contain placeholders only.

Provisioning requires an idempotency key, normalizes the phone number, and stores keyed HMAC fingerprints rather than raw idempotency material. Unique indexed request and account keys, a bounded lease, and transactional state changes make concurrent retries converge on one auth account.

Successful creation/replay returns only the auth user ID. Phone-only accounts use a deterministic storage-only placeholder email because Better Auth 1.6.23 requires a non-null core email; email/password authentication remains disabled. Account creation, provisioning completion, and its append-only audit event commit in one database transaction. The caller owns the separate business workflow; no distributed transaction or cross-database join is assumed.

Admin account mutations are also audited at the auth boundary. Every governed mutation receives a server-generated `operation_id` shared by its requested and terminal audit events. A caller-provided `x-request-id` is retained only as trace metadata and is never used for reconciliation. This audit records authentication governance, not business authorization decisions.

Disabling a Platform business member first removes business access in Platform Service, then the machine status endpoint atomically bans the Auth account and deletes its stored OAuth Access Token, Refresh Token, and Better Auth Session rows. Re-enabling clears the ban but does not recreate credentials. A self-contained Access Token already delivered to a client remains cryptographically valid until its own expiry, while Platform Service still rejects it immediately because the business member is disabled or missing.

## OTP and SMS boundary

The public send request commits the HMAC challenge and an encrypted `auth_platform_sms_outbox` row in one transaction, then returns without waiting for the provider. AES-256-GCM protects the phone number and OTP with a dedicated secret; neither value is stored in plaintext. A bounded worker claims due rows using row locks and leases, rechecks the current challenge generation immediately before delivery, decrypts only for delivery, passes the actual remaining TTL, and applies exponential retry backoff with a maximum attempt count. Provider calls receive an `AbortSignal`, time out before the database lease can expire, and are aborted during shutdown. A provider adapter that ignores cancellation violates the adapter contract; shutdown still waits only for a documented bounded settlement interval.

Issuing a newer challenge atomically marks older pending, retrying, or leased rows for the same recipient as superseded. Fencing prevents a superseded worker from updating that row afterward. If an aborted provider call does not settle within the bounded settlement window, the fenced row becomes `delivery_unknown` (status 5), is never retried or automatically deleted, and remains indexed by status for operator reconciliation. An external provider may already have accepted a message in the narrow interval between the final database recheck and supersession; that external side-effect boundary cannot be rolled back, so providers should support idempotent message identifiers when an adapter is added.

Unknown and banned accounts execute the same cryptographic and transactional write stages using an immediately expired challenge and a terminal, non-deliverable outbox row keyed in a separate HMAC namespace. They never create an account/session or deliverable message, and the normal bounded expiry/terminal cleanup removes those dummy rows.

Verification is performed through Better Auth Phone Number plugin's official `verifyOTP` hook. Consequently, `auth_platform_verification` remains empty for this OTP flow; this is intentional, not missing persistence.

When Platform is enabled, a 30-second lifecycle tick runs without overlap in one process and uses a MySQL advisory lock across instances. It delivers due outbox rows and performs bounded indexed cleanup of expired abuse counters, OTP challenges, Better Auth verification rows, and terminal SMS outbox rows older than seven days. Graceful shutdown stops scheduling and awaits the active tick. No cleanup scan runs on a request path.

Production fails closed: enabling Platform requires a named SMS provider, and startup currently rejects every name because no production adapter has been registered. There is no console, no-op, or in-memory production fallback. Tests inject a spy provider explicitly.

## Tokens and signing keys

The normative resource-server contract is [Access-token claims](../contracts/access-token-claims.md), backed by the [JSON Schema](../contracts/access-token-claims.schema.json). Signing uses Ed25519/EdDSA. Default deployment values are a 15-minute access-token TTL, 30-day key rotation, and 24-hour retired-key publication grace; configuration also enforces grace greater than token TTL plus 60 seconds.

Better Auth encrypts private JWK material before storing it in `auth_platform_jwks`. During grace, both current and retired public keys are published. After grace, a retired key is no longer published, but Better Auth 1.6.23 retains its database row and exposes no official cleanup API. Operations must account for that supported limitation rather than deleting rows through an undocumented path.

Platform Access Tokens default to 15 minutes. With the deployed example `AUTH_PLATFORM_LOGIN_TTL_SECONDS=2592000`, Platform login/session and refresh credentials have a 30-day absolute ceiling: session refresh is disabled, authorization checks both the stored session expiry and `session.created_at + AUTH_PLATFORM_LOGIN_TTL_SECONDS`, and refresh checks the stored refresh expiry plus `auth_time + AUTH_PLATFORM_LOGIN_TTL_SECONDS`. Refresh rotation never moves that original authentication deadline. At or after the deadline, session reuse and refresh fail and a new OTP authentication is required.
