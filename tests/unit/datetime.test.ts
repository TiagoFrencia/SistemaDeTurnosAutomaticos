import { describe, expect, it } from "vitest";
import { addMinutes } from "@/lib/datetime";

describe("datetime helpers", () => {
  it("adds minutes preserving the source timezone offset", () => {
    expect(addMinutes("2026-06-01T09:00:00-03:00", 60)).toBe(
      "2026-06-01T10:00:00.000-03:00"
    );
  });
});
