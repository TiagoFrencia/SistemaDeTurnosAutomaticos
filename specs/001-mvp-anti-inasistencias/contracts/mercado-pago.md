# Contract: Mercado Pago Integration

## Pilot Credential Resolution

MVP credential source:

- Environment variables configured manually for pilot businesses.
- Each Business stores a `mercadoPagoCredentialKey`.
- Payment code resolves `MERCADOPAGO_ACCESS_TOKEN_<KEY>` or equivalent server-side configuration.

Rules:

- Credentials are never entered by public customers.
- Credentials are not exposed to browser code.
- Missing credentials block checkout creation with a clear admin/support error.

## Checkout Preference Creation

Input:

- appointmentId
- businessId
- service name
- deposit amount
- customer information
- callback URLs
- webhook notification URL

Output:

- providerPreferenceId
- checkoutUrl
- Payment record with status pending

## Webhook State Mapping

| Mercado Pago outcome | Payment status | Appointment status | Slot availability |
|----------------------|----------------|--------------------|-------------------|
| approved | approved | confirmed | occupied |
| rejected | rejected | payment_failed | released |
| cancelled | cancelled | payment_failed | released |
| expired | expired | payment_expired | released |
| pending/in_process | pending | pending_payment | held |

## Idempotency

- Webhook processing must be idempotent by provider payment/preference id.
- Approved appointments must not trigger duplicate confirmations.
- Final failed/expired states must not later be overwritten except by an explicit supported provider transition.

## Phase 2 OAuth Design

Future OAuth onboarding should add:

- Admin action to connect Mercado Pago.
- OAuth callback that stores encrypted business credentials or refresh metadata.
- Credential resolver that first checks connected account credentials, then pilot environment fallback if enabled.
- Admin status indicator for connected/disconnected payment account.

The Phase 2 OAuth design must preserve the same payment service contract used by MVP checkout creation.
