# API Contract: MVP Anti-Inasistencias

This contract documents public and admin interfaces expected by the MVP. Exact framework implementation can vary, but behavior and payload shape should remain stable.

## Public Booking

### GET /{businessSlug}

Purpose: Render public booking entry for one business.

Success:

- Shows active business identity, active services, and booking entry flow.
- Returns not found or inactive state for missing/inactive slug.

### GET /api/public/businesses/{businessSlug}/availability

Query: serviceId, professionalId optional, from, to.

Response:

```json
{
  "business": {
    "id": "uuid",
    "name": "Achul_Nails",
    "slug": "achul-nails",
    "address": "Direccion a confirmar"
  },
  "service": {
    "id": "uuid",
    "name": "Manicure semipermanente",
    "durationMinutes": 60,
    "priceAmount": 5000,
    "depositAmount": 1500
  },
  "professionals": [
    { "id": "uuid", "name": "Azul" }
  ],
  "selectedProfessionalId": "uuid",
  "slots": [
    { "startAt": "2026-06-01T13:00:00-03:00", "endAt": "2026-06-01T14:00:00-03:00" }
  ]
}
```

Rules:

- Include only slots inside active hours.
- Exclude confirmed appointments, pending payment holds, and availability blocks.
- Return an empty slots array when no availability exists.
- Include business, service, price, deposit, and professional metadata so the public UI does not need separate metadata requests.
- If there is only one active professional, select it automatically and return its id in `selectedProfessionalId`.

### POST /api/bookings

Purpose: Create a pending appointment hold and Mercado Pago checkout preference.

Request:

```json
{
  "businessSlug": "achul-nails",
  "serviceId": "uuid",
  "professionalId": "uuid",
  "startAt": "2026-06-01T13:00:00-03:00",
  "customer": {
    "fullName": "Ana Perez",
    "phone": "+5493580000000",
    "email": "ana@example.com"
  }
}
```

Response:

```json
{
  "appointmentId": "uuid",
  "status": "pending_payment",
  "checkoutUrl": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=..."
}
```

Failure cases:

- 409 if slot is no longer available.
- 400 if service, professional, or customer data is invalid.
- 503 if Mercado Pago credentials are missing for the pilot business.

## Mercado Pago Webhook

### POST /api/mercado-pago/webhook

Purpose: Process Mercado Pago payment notifications.

Behavior:

- Verify the notification enough for the selected Mercado Pago integration mode.
- Resolve payment/preference to the linked appointment.
- Approved payment: create/update Payment as approved, move Appointment to confirmed, dispatch booking confirmation notification.
- Rejected/cancelled/expired payment: create/update Payment state, move Appointment to payment_failed or payment_expired, release the slot.
- Duplicate webhook: idempotently keep the existing final state.

Response:

```json
{ "received": true }
```

## Admin Services

### POST /api/admin/services

Creates a service for the authenticated business.

Required fields: name, durationMinutes, priceAmount, depositType, depositValue.

### PATCH /api/admin/services/{serviceId}

Updates service details or active state. Existing future appointments keep their stored total/deposit amounts.

## Admin Availability

### POST /api/admin/business-hours

Creates or replaces weekly business/professional hours.

### POST /api/admin/availability-blocks

Creates a manual block.

Rules:

- Blocks affect future availability immediately.
- Existing confirmed appointments are not automatically cancelled by a block.

## Admin Appointments

### POST /api/admin/appointments/manual

Creates a manual appointment.

Request includes business customer, service, professional, startAt, and depositRequired false/true.

Rules:

- Admin-only endpoint.
- Can create a no-deposit confirmed appointment.
- Must still prevent overlap with existing confirmed or pending appointments.

### PATCH /api/admin/appointments/{appointmentId}/status

Allowed updates: attended, no_show, cancelled.

Rules:

- Store the status change for future reporting.
- Do not alter payment state when marking attended or no_show.
