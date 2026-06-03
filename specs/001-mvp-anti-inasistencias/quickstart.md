# Quickstart: MVP Anti-Inasistencias

## Purpose

Use this quickstart to validate the MVP behavior after implementation.

## Environment

Required server-side configuration:

- Supabase URL and server keys.
- Resend API key and sender address.
- Mercado Pago pilot access token per business credential key.
- Public app URL for Mercado Pago callbacks and webhook.

Pilot Mercado Pago setup:

1. Create or choose a pilot business.
2. Assign `mercadoPagoCredentialKey`, for example `ACHUL`.
3. Configure the matching server environment variable, for example `MERCADOPAGO_ACCESS_TOKEN_ACHUL`.
4. Configure `NGROK_PUBLIC_URL` for local webhook testing, following `docs/local-webhooks-ngrok.md`.
5. Confirm checkout creation fails clearly when the key is missing.

## Seed Scenario

Create one pilot business:

- Name: Achul_Nails
- Slug: achul-nails
- Timezone: America/Argentina/Buenos_Aires
- One professional: Azul
- One service: Manicure semipermanente, 60 minutes, ARS 5000, deposit ARS 1500
- Hours: Monday to Friday, 09:00 to 18:00

## Validation Scenarios

### Scenario 1: Customer books and pays

1. Open `/{businessSlug}`.
2. Select the active service and professional.
3. Select an available slot.
4. Enter full name, phone, and email.
5. Submit booking and verify checkout URL is returned.
6. Simulate or complete approved Mercado Pago payment.
7. Verify appointment status becomes confirmed.
8. Verify the selected slot no longer appears.
9. Verify confirmation email notification is recorded as sent or queued.

### Scenario 2: Rejected or expired payment releases slot

1. Start a booking and create a pending payment hold.
2. Simulate a rejected or expired Mercado Pago webhook.
3. Verify appointment status becomes payment_failed or payment_expired.
4. Verify the original slot appears again in public availability.
5. Verify no confirmation email is sent.

### Scenario 3: Admin blocks availability

1. Create a manual block for a future time range.
2. Open public availability for that date.
3. Verify blocked slots are not listed.
4. Remove or expire the block if the implementation supports it.

### Scenario 4: Admin creates manual no-deposit appointment

1. Open admin appointment creation.
2. Select customer, service, professional, and slot.
3. Create appointment with depositRequired false.
4. Verify appointment is confirmed and occupies the slot.
5. Verify remaining amount equals the full service price.

### Scenario 5: Admin marks attendance

1. Open a confirmed appointment detail.
2. Mark as attended.
3. Verify state is attended and payment state remains unchanged.
4. Repeat with no_show on another appointment.

### Scenario 6: Notification interface remains channel-ready

1. Trigger booking confirmation.
2. Verify booking/payment code calls NotificationService, not the email provider directly.
3. Verify email adapter handles the MVP send.
4. Verify notification records store channel and templateKey.
