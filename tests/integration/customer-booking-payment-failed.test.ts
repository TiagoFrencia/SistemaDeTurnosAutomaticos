import { describe, expect, it } from "vitest";
import { processPaymentWebhook, type PaymentWebhookRepository } from "@/lib/booking/payment-webhook-service";
import { InMemoryNotificationLog, NotificationService } from "@/lib/notifications/notification-service";

describe("customer booking failed payment flow", () => {
  it.each([
    ["rejected", "payment_failed"],
    ["cancelled", "payment_failed"],
    ["expired", "payment_expired"]
  ] as const)("moves %s payments to %s and releases the slot", async (outcome, expectedStatus) => {
    const repository = new FakePaymentWebhookRepository();
    repository.seedAppointment("apt-1");

    await processPaymentWebhook(
      repository,
      new NotificationService([], new InMemoryNotificationLog()),
      {
        appointmentId: "apt-1",
        providerPaymentId: `mp-${outcome}`,
        outcome,
        rawStatus: outcome
      }
    );

    expect(repository.appointments.get("apt-1")?.status).toBe(expectedStatus);
    expect(repository.isBlockingAppointment("apt-1")).toBe(false);
    expect(repository.paymentsByAppointment.get("apt-1")).toMatchObject({
      appointmentId: "apt-1",
      providerPaymentId: `mp-${outcome}`,
      status: outcome
    });
  });
});

class FakePaymentWebhookRepository implements PaymentWebhookRepository {
  readonly appointments = new Map<string, { status: string }>();
  readonly paymentsByAppointment = new Map<string, Record<string, unknown>>();
  private readonly processedProviderPaymentIds = new Set<string>();

  seedAppointment(appointmentId: string): void {
    this.appointments.set(appointmentId, { status: "pending_payment" });
  }

  isBlockingAppointment(appointmentId: string): boolean {
    const status = this.appointments.get(appointmentId)?.status;
    return status === "pending_payment" || status === "confirmed";
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
