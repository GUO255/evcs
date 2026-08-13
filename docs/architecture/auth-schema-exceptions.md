# Platform Auth Schema Exceptions

This record applies to Better Auth `1.6.23`, `@better-auth/drizzle-adapter` `1.6.23`, and `@better-auth/oauth-provider` `1.6.23`.

## Better Auth-owned identifiers and timestamps

The pinned Better Auth CLI generated string primary keys (`varchar(36)`) and millisecond MySQL `timestamp(3)` columns. Compatibility characterization on MySQL 8.4 confirmed that the Drizzle adapter returns IDs as strings and timestamps as JavaScript `Date` objects for user, verification, session, OAuth token, and JWKS operations. Numeric IDs and Unix-second columns were therefore rejected for Better Auth-owned tables; forcing them would require a custom adapter. Service-owned tables retain `BIGINT UNSIGNED` identifiers and Unix-second `INT UNSIGNED` times.

All MySQL connections are pinned to UTC with `timezone: "Z"` and `SET time_zone = '+00:00'`. The API boundary must serialize Better Auth `Date` values as ISO UTC instants.

## Optional columns, text columns, and logical relations

The official generated schema contains nullable plugin fields and `text` columns because the OAuth Provider accepts variable-length URI arrays, metadata, token material, and optional RFC fields. The reviewed migration keeps these official types. Physical foreign keys emitted by the CLI were removed: ownership and cleanup remain application-level relations, consistent with the repository DDL policy. The OAuth child `client_id` columns were widened from the CLI's incompatible `varchar(36)` to `varchar(255)` because the provider's own `oauthClient.client_id` is `varchar(255)` and the official documentation permits UUID- and URL-shaped client IDs; a MySQL characterization reproduced `ER_DATA_TOO_LONG` before this correction.

## Phone OTP verification value — resolved

Better Auth Phone Number `1.6.23` still stores `${code}:attempts` when its built-in `/phone-number/send-otp` route is used. The Platform domain therefore does not dispatch that route to Better Auth. Its focused send boundary creates a service-owned challenge containing only keyed HMAC digests plus attempt and expiry metadata. The plugin's documented `verifyOTP` option replaces its internal verification logic; after successful custom verification, the pinned `dist/plugins/phone-number/routes.mjs` implementation continues through the official existing-user update, session creation, and session-cookie path. `signUpOnVerification` remains unset. This closes the plaintext exception without a custom adapter, without transient plaintext database writes, and without race-prone callback cleanup.

## Audit table privileges

The auth-service runtime database role must receive only `INSERT` and the narrowly required `SELECT` privilege on `auth_platform_audit_event`; it must not receive `UPDATE` or `DELETE`. Retention and export run under a separate operator role. The migration intentionally does not grant users because deployment-specific principals are not known locally.
