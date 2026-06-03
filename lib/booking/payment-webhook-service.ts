import type { PaymentOutcome } from "@/lib/domain/types";
import type { InMemoryBookingHoldStore } from "@/lib/booking/booking-hold-service";
import { sendBookingConfirmedNotification } from "@/lib/booking/booking-confirmation-service";
import type { NotificationService } from "@/lib/notifications/notification-service";

type MercadoPagoWebhookEvent = {
  appointmentId: string;
  providerPaymentId: string;
  outcome: PaymentOutcome;
};

export async function applyMercadoPagoWebhook(
  store: InMemoryBookingHoldStore,
  event: MercadoPagoWebhookEvent
): Promise<void> {
  if (store.hasPayment(event.providerPaymentId)) {
    return;
  }

  const appointment = store.findAppointment(event.appointmentId);
  if (!appointment) {
    throw new Error(`Appointment ${event.appointmentId} was not found`);
  }

  store.recordPayment({
    appointmentId: event.appointmentId,
    providerPaymentId: event.providerPaymentId,
    status: event.outcome
  });

  if (event.outcome === "approved") {
    appointment.status = "confirmed";
    return;
  }

  if (event.outcome === "expired") {
    appointment.status = "payment_expired";
    return;
  }

  if (event.outcome === "rejected" || event.outcome === "cancelled") {
    appointment.status = "payment_failed";
  }
}

export type PersistedMercadoPagoWebhookEvent = MercadoPagoWebhookEvent & {
  rawStatus?: string;
  rawStatusDetail?: string;
};

export type WebhookAppointment = {
  id: string;
  businessId: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerName: string;
  serviceName: string;
  startAt: string;
};

export type RecordWebhookPaymentInput = PersistedMercadoPagoWebhookEvent & {
  businessId: string;
  status: PaymentOutcome;
};

export type PaymentWebhookRepository = {
  hasProcessedPayment(providerPaymentId: string): Promise<boolean>;
  loadAppointmentForWebhook(appointmentId: string): Promise<WebhookAppointment | null>;
  recordWebhookPayment(input: RecordWebhookPaymentInput): Promise<void>;
  updateAppointmentStatus(appointmentId: string, status: "pending_payment" | "confirmed" | "payment_failed" | "payment_expired"): Promise<void>;
};

export async function processPaymentWebhook(
  repository: PaymentWebhookRepository,
  notifications: NotificationService,
  event: PersistedMercadoPagoWebhookEvent
): Promise<void> {
  if (await repository.hasProcessedPayment(event.providerPaymentId)) {
    return;
  }

  const appointment = await repository.loadAppointmentForWebhook(event.appointmentId);
  if (!appointment) {
    throw new Error(`Appointment ${event.appointmentId} was not found`);
  }

  await repository.recordWebhookPayment({
    ...event,
    businessId: appointment.businessId,
    status: event.outcome
  });

  const nextStatus = appointmentStatusForPaymentOutcome(event.outcome);
  await repository.updateAppointmentStatus(event.appointmentId, nextStatus);

  if (event.outcome === "approved") {
    await sendBookingConfirmedNotification(notifications, appointment);
  }
}

function appointmentStatusForPaymentOutcome(
  outcome: PaymentOutcome
): "pending_payment" | "confirmed" | "payment_failed" | "payment_expired" {
  if (outcome === "approved") {
    return "confirmed";
  }

  if (outcome === "expired") {
    return "payment_expired";
  }

  if (outcome === "rejected" || outcome === "cancelled") {
    return "payment_failed";
  }

  return "pending_payment";
}
