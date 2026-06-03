import { describe, expect, it } from "vitest";
import { InMemoryBookingHoldStore, createBookingHold } from "@/lib/booking/booking-hold-service";

describe("BookingHoldService concurrency guard", () => {
  it("allows only one pending hold for the same professional and time range", async () => {
    const store = new InMemoryBookingHoldStore();
    const input = {
      businessId: "biz-1",
      professionalId: "pro-1",
      serviceId: "svc-1",
      customerId: "cus-1",
      startAt: "2026-06-01T09:00:00-03:00",
      endAt: "2026-06-01T10:00:00-03:00",
      totalAmount: 5000,
      depositAmount: 1500
    };

    const results = await Promise.allSettled([
      createBookingHold(store, input),
      createBookingHold(store, { ...input, customerId: "cus-2" })
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(store.appointments).toHaveLength(1);
  });
});
