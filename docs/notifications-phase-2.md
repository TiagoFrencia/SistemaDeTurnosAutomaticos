# Notifications Phase 2

## Objective

Phase 2 adds WhatsApp and optionally SMS notifications without changing booking or payment domain logic. The extension point remains `NotificationAdapter`, and every channel should flow through `NotificationService`.

Update 2026-06-01: WhatsApp confirmation/reminder delivery and guided booking by chat now have an MVP runtime implementation behind env vars. SMS, notification settings UI, retries dashboard, and provider template management remain future work.

WhatsApp may also become a future booking entry point, not only a reminder channel. In that case, the WhatsApp automation must call the same booking/manual appointment services used by the web UI instead of inserting appointments directly.

## Current MVP Baseline

The MVP has one active channel:

- `email` is implemented through the registered email adapter.
- Booking and payment flows call `NotificationService`.
- `NotificationService` persists each send attempt in `notifications`.
- A notification failure does not roll back a confirmed appointment.

Reserved future channels already exist in the contract:

- `whatsapp`
- `sms`

Template keys are stable across channels:

- `booking.confirmed`
- `booking.payment_failed`
- `booking.payment_expired`

## Target Architecture

Phase 2 should extend the adapter registry:

```ts
class WhatsAppNotificationAdapter implements NotificationAdapter {
  channel = "whatsapp" as const;

  async send(request: NotificationRequest): Promise<NotificationResult> {
    // Provider-specific implementation lives here.
  }
}
```

Booking and payment services should continue sending a stable `NotificationRequest`. They should not branch on provider-specific behavior, provider template ids, WhatsApp approvals, or SMS delivery details.

## Channel Selection

Channel selection should happen before dispatch, in a policy layer close to admin/business configuration.

Recommended precedence:

1. Use the business preferred channel when the customer has a valid recipient and required opt-in.
2. Fall back to email when the preferred channel is unavailable.
3. Record failed or skipped attempts so support can diagnose delivery issues.

A future business setting could support:

- enabled channels per business.
- default channel per template key.
- fallback channel.
- sender/provider configuration.
- customer opt-in requirements.

## Future Data Model

Future migrations may add a table such as `business_notification_channels`:

| Field | Purpose |
|-------|---------|
| `id` | Internal channel configuration id |
| `business_id` | Owning business |
| `channel` | `email`, `whatsapp`, or `sms` |
| `provider` | Provider implementation, for example `resend` or `twilio` |
| `sender_id` | Provider sender, phone number, or email identity |
| `config_ciphertext` | Encrypted provider settings when needed |
| `status` | `active`, `disabled`, or `error` |
| `last_error` | Last provider/configuration error |
| `created_at` / `updated_at` | Audit timestamps |

A future `notification_templates` table may also map stable `templateKey` values to provider-specific template ids and localized copy per channel.

## Templates And Payloads

Template keys must remain provider-agnostic. Channel-specific adapters can map a stable `templateKey` to provider-specific assets:

- Email can render HTML and plain text bodies.
- WhatsApp can map to approved template ids and parameter arrays.
- SMS can render compact text-only copy.

The payload should stay stable and include domain facts, not provider formatting:

- business name.
- customer name.
- service name.
- appointment date/time.
- total amount, deposit amount, and remaining amount when relevant.
- appointment id or support reference.

## Notification Logging

Every send attempt should continue to be recorded in `notifications` with:

- `business_id`.
- `appointment_id`, when available.
- `channel`.
- `template_key`.
- `recipient`.
- `status`: `queued`, `sent`, or `failed`.
- provider message id, when available.
- error details safe for operators.

The log is the operational source for support and retries. It should not store raw secrets or sensitive provider credentials.

## Failure Handling

Notification delivery must not change appointment or payment state.

Recommended behavior:

- Return `sent` when the provider confirms immediate delivery or acceptance.
- Return `queued` when the provider accepts async processing.
- Return `failed` for provider rejection, missing configuration, invalid recipient, or template errors.
- Retry transient failures with bounded backoff.
- Avoid retrying permanent failures such as invalid recipient or missing opt-in.
- Keep support-visible error messages concise and safe.

Phase 2 may add a retry job, admin retry action, or support dashboard, but the MVP domain rule remains: a confirmed booking stays confirmed even if notification delivery fails.

## WhatsApp Considerations

WhatsApp support should account for:

- Business/provider onboarding and sender verification.
- Approved template lifecycle.
- Customer opt-in and valid phone formatting.
- Locale and timezone handling.
- Provider rate limits and async status callbacks.
- Fallback to email when WhatsApp is unavailable.

Status callbacks from a WhatsApp provider can update notification delivery metadata, but they should not update appointments directly.

## WhatsApp Booking Entry Point

If customers request appointments through WhatsApp in Phase 2, the automation should:

- identify the business and customer from the conversation context.
- offer only services, professionals, and slots returned by the existing availability service.
- create public payment holds through the booking service when the customer must pay a deposit online.
- create manual/cash appointments only through an admin-approved path when cash is received in the salon.
- send confirmations through `NotificationService` after the same payment or admin state transitions used by the web flow.

The WhatsApp layer should be an orchestration adapter. It must not bypass overlap protection, payment confirmation rules, notification logging, or admin cash handling.

## Implementation Criteria

Phase 2 can be implemented when:

- Admin auth and business ownership are in place.
- The provider and sender strategy is selected.
- Customer opt-in rules are defined.
- Template keys and payloads are confirmed stable.
- Channel selection and fallback behavior are specified.
- `NotificationService` tests cover multiple adapters and failed fallback paths.
- Operational retry and support visibility requirements are defined.

## Out Of Scope For MVP

- WhatsApp or SMS provider integration.
- Provider sender onboarding.
- Template approval workflows.
- Notification retry workers.
- Customer opt-in management UI.
- Any change to booking, payment, or appointment state transitions.
