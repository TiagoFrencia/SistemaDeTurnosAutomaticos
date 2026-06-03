/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

const metrics = [
  { href: "/admin/turnos", label: "Turnos de hoy", value: 2, helper: "Agenda del día" },
  { href: "/admin/turnos?status=pending_payment", label: "Pendientes de pago", value: 0, helper: "Se liberan si no pagan" },
  { href: "/admin/whatsapp", label: "Chats a revisar", value: 1, helper: "Clientas que pueden necesitar ayuda" }
];

describe("AdminDashboard", () => {
  it("shows human dashboard metrics and the next appointment", () => {
    render(
      <AdminDashboard
        metrics={metrics}
        nextAppointment={{
          customerName: "Ana Perez",
          professionalName: "Azul",
          serviceName: "Manicure",
          startAt: "2026-06-02T15:00:00.000-03:00"
        }}
      />
    );

    expect(screen.getByText("Turnos de hoy")).toBeInTheDocument();
    expect(screen.getByText("Agenda del día")).toBeInTheDocument();
    expect(screen.getByText("Se liberan si no pagan")).toBeInTheDocument();
    expect(screen.getByText("Clientas que pueden necesitar ayuda")).toBeInTheDocument();
    expect(screen.getByText(/Ana Perez/)).toBeInTheDocument();
    expect(screen.getByText(/Manicure con Azul/)).toBeInTheDocument();
  });

  it("shows a calm fallback when there are no more appointments today", () => {
    render(<AdminDashboard metrics={metrics} nextAppointment={null} />);

    expect(screen.getByText("No hay más turnos hoy")).toBeInTheDocument();
    expect(screen.getByText(/La agenda queda tranquila/)).toBeInTheDocument();
  });
});
