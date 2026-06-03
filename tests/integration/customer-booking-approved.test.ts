import { describe, expect, it } from "vitest";
import { processPaymentWebhook, type PaymentWebhookRepository } from "@/lib/booking/payment-webhook-service";
import {
  InMemoryNotificationLog,
  NotificationService,
  type NotificationAdapter
} from "@/lib/notifications/notification-service";

describe("customer booking approved payment flow", () => {
  it("confirms the appointment, records the payment, sends one confirmation, and is idempotent", async () => {
    const repository = new FakePaymentWebhookRepository();
    repository.seedAppointment("apt-1");
    repository.seedPendingPayment("apt-1", "pref-1");
    const notificationLog = new InMemoryNotificationLog();
    const notifications = new NotificationService([sentEmailAdapter()], notificationLog);

    await processPaymentWebhook(repository, notifications, {
      appointmentId: "apt-1",
      providerPaymentId: "mp-1",
      outcome: "approved",
      rawStatus: "approved",
      rawStatusDetail: "accredited"
    });
    await processPaymentWebhook(repository, notifications, {
      appointmentId: "apt-1",
      providerPaymentId: "mp-1",
      outcome: "approved",
      rawStatus: "approved",
      rawStatusDetail: "accredited"
    });

    expect(repository.appointments.get("apt-1")?.status).toBe("confirmed");
    expect(repository.paymentsByAppointment.get("apt-1")).toMatchObject({
      appointmentId: "apt-1",
      providerPaymentId: "mp-1",
      status: "approved",
      rawStatus: "approved",
      rawStatusDetail: "accredited"
    });
    expect(notificationLog.records).toMatchObject([
      {
        appointmentId: "apt-1",
        channel: "email",
        templateKey: "booking.confirmed",
        recipient: "ana@example.com",
        status: "sent"
      }
    ]);
  });
});

function sentEmailAdapter(): NotificationAdapter {
  return {
    channel: "email",
    send: async () => ({ status: "sent", providerMessageId: "email-1" })
  };
}

class FakePaymentWebhookRepository implements PaymentWebhookRepository {
  readonly appointments = new Map<string, { status: string }>();
  readonly paymentsByAppointment = new Map<string, Record<string, unknown>>();
  private readonly processedProviderPaymentIds = new Set<string>();

  seedAppointment(appointmentId: string): void {
    this.appointments.set(appointmentId, { status: "pending_payment" });
  }

  seedPendingPayment(appointmentId: string, providerPreferenceId: string): void {
    this.paymentsByAppointment.set(appointmentId, {
      appointmentId,
      providerPreferenceId,
      status: "pending"
    });
  }

  async hasProcessedPayment(providerPaymentId: string): Promise<boolean> {
    return this.processedProviderPaymentIds.has(providerPaymentId);
  }

  async loadAppointmentForWebhook(appointmentId: string) {
    if (!this.appointments.has(appointmentId)) {
      return null;
    }

    return {
      id: appointmentId,
      businessId: "biz-1",
      customerEmail: "ana@example.com",
      customerPhone: "+5491111111111",
      customerName: "Ana Perez",
      serviceName: "Manicure semipermanente",
      startAt: "2026-06-01T09:00:00-03:00"
    };
  }

  async recordWebhookPayment(input: Record<string, unknown>): Promise<void> {
    this.processedProviderPaymentIds.add(String(input.providerPaymentId));
    this.paymentsByAppointment.set(String(input.appointmentId), input);
  }

  async updateAppointmentStatus(appointmentId: string, status: string): Promise<void> {
    const appointment = this.appointments.get(appointmentId);
    if (appointment) {
      appointment.status = status;
    }
  }
}
