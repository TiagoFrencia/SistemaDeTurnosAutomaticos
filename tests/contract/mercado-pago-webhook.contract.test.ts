import { describe, expect, it } from "vitest";
import { InMemoryBookingHoldStore } from "@/lib/booking/booking-hold-service";
import { applyMercadoPagoWebhook } from "@/lib/booking/payment-webhook-service";

describe("Mercado Pago webhook contract", () => {
  it("confirms an appointment exactly once when payment is approved", async () => {
    const store = new InMemoryBookingHoldStore();
    store.seedPendingAppointment("apt-1");

    await applyMercadoPagoWebhook(store, {
      appointmentId: "apt-1",
      providerPaymentId: "mp-1",
      outcome: "approved"
    });
    await applyMercadoPagoWebhook(store, {
      appointmentId: "apt-1",
      providerPaymentId: "mp-1",
      outcome: "approved"
    });

    expect(store.findAppointment("apt-1")?.status).toBe("confirmed");
    expect(store.payments).toHaveLength(1);
  });

  it("releases the slot when payment is rejected or expired", async () => {
    const store = new InMemoryBookingHoldStore();
    store.seedPendingAppointment("apt-1");

    await applyMercadoPagoWebhook(store, {
      appointmentId: "apt-1",
      providerPaymentId: "mp-2",
      outcome: "expired"
    });

    expect(store.findAppointment("apt-1")?.status).toBe("payment_expired");
    expect(store.isBlockingAppointment("apt-1")).toBe(false);
  });
});
