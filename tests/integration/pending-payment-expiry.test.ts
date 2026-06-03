import { describe, expect, it } from "vitest";
import {
  expirePendingPaymentHolds,
  type PendingPaymentExpiryRepository
} from "@/lib/booking/pending-payment-expiry-service";

describe("pending payment expiry", () => {
  it("expires abandoned pending holds and pending payments", async () => {
    const repository = new FakePendingPaymentExpiryRepository([
      { id: "apt-1", payments: [{ status: "pending" }] },
      { id: "apt-2", payments: [] },
      { id: "apt-3", payments: [{ status: "approved" }] }
    ]);

    const result = await expirePendingPaymentHolds(repository, new Date("2026-06-02T15:00:00.000Z"), 30);

    expect(result).toEqual({ scanned: 3, expired: 2 });
    expect(repository.expiredAppointments).toEqual(["apt-1", "apt-2"]);
    expect(repository.expiredPayments).toEqual(["apt-1", "apt-2"]);
  });
});

class FakePendingPaymentExpiryRepository implements PendingPaymentExpiryRepository {
  expiredAppointments: string[] = [];
  expiredPayments: string[] = [];

  constructor(private readonly appointments: Array<{ id: string; payments: Array<{ status: string }> }>) {}

  async listExpiredPendingAppointments() {
    return this.appointments;
  }

  async markAppointmentsExpired(input: { appointmentIds: string[] }) {
    this.expiredAppointments = input.appointmentIds;
  }

  async markPendingPaymentsExpired(input: { appointmentIds: string[] }) {
    this.expiredPayments = input.appointmentIds;
  }
}
