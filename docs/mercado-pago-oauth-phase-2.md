# Mercado Pago OAuth Phase 2

## Objective

Phase 2 replaces pilot-only manual Mercado Pago credentials with a per-business connection flow. The admin should be able to connect a business Mercado Pago account, keep that connection healthy, and revoke it without changing the public booking or payment contracts.

This is documentation only. OAuth, database migrations, endpoints, and admin UI for account connection are not part of the current MVP runtime.

## Current MVP Baseline

The MVP uses a controlled pilot credential model:

- `businesses.mercado_pago_credential_key` selects a server-side environment variable.
- `resolveMercadoPagoAccessToken` resolves `MERCADOPAGO_ACCESS_TOKEN_<KEY>`.
- `PaymentService.createCheckoutPreference` receives booking/payment context and returns `providerPreferenceId` plus `checkoutUrl`.
- Webhooks continue to own the final appointment confirmation state.

Phase 2 must preserve this shape. Booking code should not know whether the access token came from an environment variable or a connected account.

## Proposed Flow

1. Admin starts connection from the business payment settings screen.
2. The server creates an OAuth state record containing `businessId`, nonce, expiration, and return path.
3. The admin is redirected to the Mercado Pago authorization URL.
4. The OAuth callback validates state and exchanges the authorization code for provider tokens.
5. The server stores encrypted credentials linked to the `business_id`.
6. The admin sees a connected, disconnected, expired, or error state.
7. Checkout creation resolves the connected credential first and falls back to the pilot environment credential only if fallback is explicitly enabled.
8. A refresh job or request-time refresh keeps access tokens current.
9. Revocation marks the connection inactive and deletes or invalidates usable token material.

## Future Data Model

A minimal future table could be named `business_payment_connections`:

| Field | Purpose |
|-------|---------|
| `id` | Internal connection id |
| `business_id` | Owning business |
| `provider` | Payment provider, initially `mercado_pago` |
| `access_token_ciphertext` | Encrypted access token |
| `refresh_token_ciphertext` | Encrypted refresh token |
| `expires_at` | Access token expiration |
| `account_id` | Mercado Pago account/user id |
| `scope` | Granted OAuth scope, if provided |
| `status` | `connected`, `expired`, `revoked`, or `error` |
| `last_error` | Last connection or refresh error for support |
| `created_at` / `updated_at` | Audit timestamps |
| `revoked_at` | Revocation timestamp, when applicable |

Token fields must never be exposed to browser code, logs, tests, or analytics.

## Compatibility With PaymentService

The Phase 2 implementation should add a credential resolver boundary rather than changing checkout callers.

Recommended behavior:

- `PaymentService` keeps accepting the same checkout input and returning the same output.
- `resolveMercadoPagoAccessToken` can be extended, or wrapped by a new resolver, to accept business context.
- The resolver should look for an active connected account for `businessId`.
- If no connected account exists and pilot fallback is enabled, it may continue resolving `MERCADOPAGO_ACCESS_TOKEN_<KEY>`.
- Missing or expired credentials should fail checkout creation with a clear admin/support error.

The existing webhook contract does not change. Mercado Pago still sends payment notifications, and the application still maps provider outcomes to `payments` and `appointments`.

## Admin States

The admin UI should make the payment account state explicit:

- `connected`: checkout can use the connected Mercado Pago account.
- `disconnected`: no usable connection exists.
- `expired`: refresh failed or token is no longer usable.
- `error`: last connection attempt failed and requires operator review.
- `fallback`: pilot credential is still being used during transition.

The state indicator should avoid displaying token values or sensitive provider metadata.

## Security And Operational Risks

- Tokens require encryption at rest and strict service-role-only access.
- OAuth state validation must protect against CSRF and replay.
- Token refresh must be idempotent and safe under concurrent requests.
- Revocation must stop new checkout creation for the revoked connection.
- Rotation strategy must cover encryption keys and provider token refresh failures.
- Support tooling needs enough account metadata to diagnose issues without exposing secrets.
- The connected Mercado Pago account determines the receiving account and may affect fiscal ownership, settlement, and business reconciliation.
- Pilot fallback is useful during transition but should have a kill switch and clear observability.

## Implementation Criteria

Phase 2 can be implemented when:

- Product confirms one Mercado Pago account per business is the correct ownership model.
- The database has an encrypted credential storage strategy.
- Admin auth and business ownership are in place.
- OAuth redirect URLs are configured for local, preview, and production environments.
- Token refresh, revocation, and error states have tests.
- Checkout creation remains compatible with the current `PaymentService` contract.
- The pilot environment credential fallback behavior is explicitly enabled or disabled per environment.

## Out Of Scope For MVP

- Mercado Pago OAuth authorization and callback endpoints.
- Connected-account admin settings UI.
- Token storage migrations.
- Provider account reconciliation dashboards.
- Any change to booking, payment webhook, or appointment state contracts.
