# Contract: Notification Service

The booking and payment domains must communicate through this interface rather than calling email or WhatsApp providers directly.

## Notification Channels

MVP channel:

- email

Reserved future channels:

- whatsapp
- sms

## Interface

```ts
type NotificationChannel = "email" | "whatsapp" | "sms";

type NotificationTemplateKey =
  | "booking.confirmed"
  | "booking.reminder"
  | "booking.payment_failed"
  | "booking.payment_expired";

type NotificationRequest = {
  businessId: string;
  appointmentId?: string;
  channel: NotificationChannel;
  templateKey: NotificationTemplateKey;
  recipient: string;
  payload: Record<string, unknown>;
};

type NotificationResult = {
  status: "sent" | "queued" | "failed";
  providerMessageId?: string;
  error?: string;
};

interface NotificationAdapter {
  channel: NotificationChannel;
  send(request: NotificationRequest): Promise<NotificationResult>;
}

interface NotificationService {
  send(request: NotificationRequest): Promise<NotificationResult>;
}
```

## MVP Behavior

- Register only the email adapter.
- Persist every attempt as a Notification record.
- Payment approval dispatches `booking.confirmed` through the NotificationService.
- If email send fails, the appointment remains confirmed and the notification is recorded as failed for retry/support follow-up.

## Phase 2 Compatibility

- WhatsApp adapter must implement the same adapter interface.
- Booking and payment services must not branch on provider-specific WhatsApp behavior.
- Templates can diverge by channel, but template keys remain stable.
