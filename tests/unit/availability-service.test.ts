import { describe, expect, it } from "vitest";
import { getAvailableSlots } from "@/lib/availability/availability-service";

describe("AvailabilityService", () => {
  it("excludes pending_payment and confirmed appointments from generated slots", () => {
    const slots = getAvailableSlots({
      serviceDurationMinutes: 60,
      windowStart: "2026-06-01T09:00:00-03:00",
      windowEnd: "2026-06-01T12:00:00-03:00",
      businessHours: [
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00"
        }
      ],
      appointments: [
        {
          professionalId: "pro-1",
          startAt: "2026-06-01T09:00:00-03:00",
          endAt: "2026-06-01T10:00:00-03:00",
          status: "pending_payment"
        },
        {
          professionalId: "pro-1",
          startAt: "2026-06-01T10:00:00-03:00",
          endAt: "2026-06-01T11:00:00-03:00",
          status: "confirmed"
        }
      ],
      blocks: [],
      professionalId: "pro-1"
    });

    expect(slots).toEqual([
      {
        startAt: "2026-06-01T11:00:00.000-03:00",
        endAt: "2026-06-01T12:00:00.000-03:00"
      }
    ]);
  });

  it("does not block slots for failed or expired payments", () => {
    const slots = getAvailableSlots({
      serviceDurationMinutes: 60,
      windowStart: "2026-06-01T09:00:00-03:00",
      windowEnd: "2026-06-01T11:00:00-03:00",
      businessHours: [
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "11:00"
        }
      ],
      appointments: [
        {
          professionalId: "pro-1",
          startAt: "2026-06-01T09:00:00-03:00",
          endAt: "2026-06-01T10:00:00-03:00",
          status: "payment_expired"
        }
      ],
      blocks: [],
      professionalId: "pro-1"
    });

    expect(slots).toHaveLength(2);
  });
});
