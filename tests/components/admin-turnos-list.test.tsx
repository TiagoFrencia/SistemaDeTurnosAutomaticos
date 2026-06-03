/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdminTurnosList from "@/components/admin/admin-turnos-list";

describe("AdminTurnosList", () => {
  it("renders appointment relations returned as objects or arrays", () => {
    render(
      <AdminTurnosList
        appointments={[
          {
            id: "appointment-1",
            start_at: "2026-06-01T09:00:00-03:00",
            end_at: "2026-06-01T10:00:00-03:00",
            status: "confirmed",
            total_amount: 5000,
            deposit_amount: 1500,
            remaining_amount: 3500,
            customers: { full_name: "Ana Perez", phone: "+5491111111111", email: "ana@example.com" },
            professionals: { name: "Azul" },
            services: { name: "Manicure" }
          },
          {
            id: "appointment-2",
            start_at: "2026-06-01T10:00:00-03:00",
            end_at: "2026-06-01T11:00:00-03:00",
            status: "confirmed",
            total_amount: 8000,
            deposit_amount: 0,
            remaining_amount: 8000,
            customers: [{ full_name: "Belen Ruiz", phone: "+5492222222222", email: null }],
            professionals: [{ name: "Luna" }],
            services: [{ name: "Kapping" }]
          }
        ]}
      />
    );

    expect(screen.getByText("Ana Perez")).toBeInTheDocument();
    expect(screen.getByText("+5491111111111")).toBeInTheDocument();
    expect(screen.getByText("Manicure")).toBeInTheDocument();
    expect(screen.getByText("Prof: Azul")).toBeInTheDocument();
    expect(screen.getByText("Belen Ruiz")).toBeInTheDocument();
    expect(screen.getByText("Kapping")).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes("Restante: $8000"))).toBeInTheDocument();
  });

  it("expands appointment detail from the list", () => {
    render(
      <AdminTurnosList
        appointments={[
          {
            id: "appointment-1",
            start_at: "2026-06-01T09:00:00-03:00",
            end_at: "2026-06-01T10:00:00-03:00",
            status: "confirmed",
            total_amount: 5000,
            deposit_amount: 1500,
            remaining_amount: 3500,
            customers: { full_name: "Ana Perez", phone: "+5491111111111", email: "ana@example.com" },
            professionals: { name: "Azul" },
            services: { name: "Manicure" }
          }
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver detalle" }));

    expect(screen.getByText("Saldo restante: $3500")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Asistio" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No asistio" })).toBeInTheDocument();
  });

  it("shows all services for a multi-service appointment and falls back to legacy service", () => {
    render(
      <AdminTurnosList
        appointments={[
          {
            id: "appointment-1",
            start_at: "2026-06-01T09:00:00-03:00",
            end_at: "2026-06-01T11:30:00-03:00",
            status: "confirmed",
            total_amount: 13000,
            deposit_amount: 4000,
            remaining_amount: 9000,
            customers: { full_name: "Ana Perez", phone: "+5491111111111", email: "ana@example.com" },
            professionals: { name: "Azul" },
            services: { name: "Manicure" },
            appointment_services: [
              { position: 2, services: { name: "Kapping gel" } },
              { position: 1, services: { name: "Manicure" } }
            ]
          },
          {
            id: "appointment-2",
            start_at: "2026-06-01T12:00:00-03:00",
            end_at: "2026-06-01T13:00:00-03:00",
            status: "confirmed",
            total_amount: 5000,
            deposit_amount: 1500,
            remaining_amount: 3500,
            customers: { full_name: "Belen Ruiz", phone: "+5492222222222", email: "belen@example.com" },
            professionals: { name: "Azul" },
            services: { name: "Servicio viejo" }
          }
        ]}
      />
    );

    expect(screen.getByText("Manicure + Kapping gel")).toBeInTheDocument();
    expect(screen.getByText("Servicio viejo")).toBeInTheDocument();
  });
});
