/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminTurnosFilters } from "@/components/admin/admin-turnos-filters";

const professionals = [{ id: "professional-1", name: "Azul" }];

describe("AdminTurnosFilters", () => {
  it("shows quick chips and keeps the mobile advanced panel collapsed initially", () => {
    render(
      <AdminTurnosFilters
        searchParams={{}}
        professionals={professionals}
        total={7}
        pageNumber={1}
        lastPage={2}
        today="2026-06-03"
      />
    );

    const chips = screen.getByLabelText("Filtros rápidos de turnos");
    expect(within(chips).getByRole("link", { name: "Todos" })).toHaveClass("active");
    expect(within(chips).getByRole("link", { name: "Hoy" })).toHaveAttribute(
      "href",
      "/admin/turnos?date=2026-06-03"
    );

    const filterButton = screen.getByRole("button", { name: "Abrir filtros avanzados" });
    expect(filterButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Abrir filtros avanzados" })).toHaveAttribute(
      "aria-controls",
      "turnos-mobile-advanced-filters"
    );
    expect(document.getElementById("turnos-mobile-advanced-filters")).toHaveAttribute("aria-hidden", "true");
  });

  it("opens the mobile advanced filters panel", () => {
    render(
      <AdminTurnosFilters
        searchParams={{ status: "confirmed" }}
        professionals={professionals}
        total={7}
        pageNumber={1}
        lastPage={2}
        today="2026-06-03"
      />
    );

    const chips = screen.getByLabelText("Filtros rápidos de turnos");
    expect(within(chips).getByRole("link", { name: "Confirmados" })).toHaveClass("active");

    fireEvent.click(screen.getByRole("button", { name: "Abrir filtros avanzados" }));

    const panel = document.getElementById("turnos-mobile-advanced-filters");
    expect(panel).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByRole("button", { name: "Abrir filtros avanzados" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByLabelText("Fecha").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Estado").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Profesional").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Cliente (nombre)").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Filtrar" }).length).toBeGreaterThan(0);
  });
});
