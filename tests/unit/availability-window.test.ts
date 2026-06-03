import { describe, expect, it } from "vitest";
import { buildPublicAvailabilityWindow, buildSevenDayAvailabilityWindow } from "@/lib/public/availability-window";

describe("buildSevenDayAvailabilityWindow", () => {
  it("keeps the legacy seven day helper available", () => {
    const window = buildSevenDayAvailabilityWindow(new Date("2026-06-01T12:30:00-03:00"));

    expect(window).toEqual({
      from: "2026-06-01T00:00:00.000-03:00",
      to: "2026-06-08T00:00:00.000-03:00"
    });
  });

  it("creates the public booking window for today plus thirty days", () => {
    const window = buildPublicAvailabilityWindow(new Date("2026-06-01T12:30:00-03:00"));

    expect(window).toEqual({
      from: "2026-06-01T00:00:00.000-03:00",
      to: "2026-07-01T00:00:00.000-03:00"
    });
  });
});
