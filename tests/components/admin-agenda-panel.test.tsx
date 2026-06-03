/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminAgendaPanel } from "@/components/admin/admin-agenda-panel";

describe("AdminAgendaPanel", () => {
  it("uses accessible tabs for hours and blocks", () => {
    render(
      <AdminAgendaPanel
        businessSlug="achul-nails"
        professionals={[{ id: "professional-1", businessId: "business-1", name: "Azul", bio: null, active: true }]}
        businessHours={[
          {
            id: "hour-1",
            businessId: "business-1",
            professionalId: null,
            dayOfWeek: 1,
            startTime: "09:00",
            endTime: "18:00",
            active: true
          }
        ]}
        availabilityBlocks={[]}
      />
    );

    const hoursTab = screen.getByRole("tab", { name: "Horarios" });
    const blocksTab = screen.getByRole("tab", { name: "Bloqueos" });

    expect(hoursTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Horarios" })).toBeInTheDocument();

    fireEvent.click(blocksTab);

    expect(hoursTab).toHaveAttribute("aria-selected", "false");
    expect(blocksTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Bloqueos" })).toBeInTheDocument();
  });
});
