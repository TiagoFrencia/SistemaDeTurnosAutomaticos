# Data Model: MVP Anti-Inasistencias

## Business

Represents a tenant/business.

Fields: id, name, slug, address, mapUrl, contactEmail, contactPhone, timezone, active, mercadoPagoCredentialKey, createdAt, updatedAt.

Relationships: has many professionals, services, business hours, availability blocks, appointments, notifications.

Validation: slug must be unique and public-safe; timezone defaults to America/Argentina/Buenos_Aires; active businesses can receive public bookings.

## Professional

Represents a person or resource that performs services.

Fields: id, businessId, name, bio, active, createdAt, updatedAt.

Relationships: belongs to business; can be linked to services; has appointments and optional business hours.

Validation: active professionals can be selected publicly only if linked to the selected service.

## Service

Represents a bookable service.

Fields: id, businessId, name, description, durationMinutes, priceAmount, depositType, depositValue, active, createdAt, updatedAt.

Relationships: belongs to business; can be offered by professionals; has appointments.

Validation: durationMinutes > 0; priceAmount >= 0; deposit amount must be non-negative and not exceed price.

## BusinessHours

Represents recurring availability.

Fields: id, businessId, professionalId nullable, dayOfWeek, startTime, endTime, active.

Relationships: belongs to business; optionally belongs to professional.

Validation: startTime must be before endTime; active hours determine slot generation.

## AvailabilityBlock

Represents manual unavailable time.

Fields: id, businessId, professionalId nullable, startAt, endAt, reason, createdBy, createdAt.

Relationships: belongs to business; optionally belongs to professional.

Validation: startAt must be before endAt; blocks remove matching slots from public availability.

## Customer

Represents a booking customer.

Fields: id, businessId, fullName, phone, email nullable, createdAt, updatedAt.

Relationships: belongs to business; has appointments.

Validation: fullName and phone are required for MVP; email is required when email confirmation is selected.

## Appointment

Represents a booking or manual turn.

Fields: id, businessId, professionalId, serviceId, customerId, startAt, endAt, status, source, depositRequired, totalAmount, depositAmount, remainingAmount, notes, createdAt, updatedAt.

Relationships: belongs to business, professional, service, customer; has payment; has notifications.

Statuses: pending_payment, confirmed, payment_failed, payment_expired, cancelled, attended, no_show.

State transitions:

- pending_payment -> confirmed after approved payment webhook.
- pending_payment -> payment_failed after rejected/cancelled payment webhook.
- pending_payment -> payment_expired after expired payment webhook or timeout job.
- confirmed -> attended or no_show by admin action.
- confirmed -> cancelled by admin action.
- manual appointments can be created directly as confirmed with depositRequired false.

Validation: no overlapping confirmed or pending_payment appointment may exist for the same business/professional/time range.

## Payment

Represents Mercado Pago deposit state.

Fields: id, businessId, appointmentId, provider, providerPreferenceId, providerPaymentId nullable, status, amount, currency, rawStatus, rawStatusDetail, webhookReceivedAt, createdAt, updatedAt.

Relationships: belongs to business and appointment.

Statuses: pending, approved, rejected, cancelled, expired, refunded.

Validation: approved payment confirms the linked appointment exactly once; rejected/cancelled/expired payment releases the linked slot.

## Notification

Represents an attempted message.

Fields: id, businessId, appointmentId nullable, channel, templateKey, recipient, payload, status, providerMessageId nullable, error nullable, sentAt nullable, createdAt.

Relationships: belongs to business; optionally belongs to appointment.

Channels: email in MVP; whatsapp and sms reserved for future adapters.

Statuses: queued, sent, failed.

Validation: booking confirmation must be sent through the notification service, not directly from booking/payment code.
