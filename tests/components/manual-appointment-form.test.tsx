/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ManualAppointmentForm } from "@/components/admin/manual-appointment-form";

describe("ManualAppointmentForm", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders service/professional selectors and submits a no-deposit appointment with bearer auth", async () => {
    localStorage.setItem("ADMIN_API_KEY", "secret");
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(init?.headers).toMatchObject({ authorization: "Bearer secret" });
      expect(body).toMatchObject({
        businessSlug: "achul-nails",
        serviceIds: ["service-1"],
        professionalId: "professional-1",
        startAt: "2026-06-01T09:00:00-03:00",
        depositMode: "none",
        customer: {
          fullName: "Ana Perez",
          phone: "+5491111111111",
          email: "ana@example.com"
        }
      });

      return jsonResponse({ appointment: { id: "appointment-1" } }, 201);
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { reload: vi.fn() });

    render(
      <ManualAppointmentForm
        businessSlug="achul-nails"
        services={[{ id: "service-1", name: "Manicure", durationMinutes: 60, priceAmount: 5000, depositAmount: 1500 }]}
        professionals={[{ id: "professional-1", name: "Azul" }]}
      />
    );

    fireEvent.change(screen.getByLabelText("Profesional"), { target: { value: "professional-1" } });
    fireEvent.change(screen.getByLabelText("Inicio"), { target: { value: "2026-06-01T09:00" } });
    fireEvent.change(screen.getByLabelText("Nombre cliente"), { target: { value: "Ana Perez" } });
    fireEvent.change(screen.getByLabelText("Telefono"), { target: { value: "+5491111111111" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear turno manual" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("can submit a cash-deposit appointment", async () => {
    localStorage.setItem("ADMIN_API_KEY", "secret");
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toMatchObject({ depositMode: "cash" });
      return jsonResponse({ appointment: { id: "appointment-1" } }, 201);
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { reload: vi.fn() });

    render(
      <ManualAppointmentForm
        businessSlug="achul-nails"
        services={[{ id: "service-1", name: "Manicure", durationMinutes: 60, priceAmount: 5000, depositAmount: 1500 }]}
        professionals={[{ id: "professional-1", name: "Azul" }]}
      />
    );

    fireEvent.change(screen.getByLabelText("Profesional"), { target: { value: "professional-1" } });
    fireEvent.change(screen.getByLabelText("Inicio"), { target: { value: "2026-06-01T09:00" } });
    fireEvent.click(screen.getByLabelText("Sena pagada en efectivo"));
    fireEvent.change(screen.getByLabelText("Nombre cliente"), { target: { value: "Ana Perez" } });
    fireEvent.change(screen.getByLabelText("Telefono"), { target: { value: "+5491111111111" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear turno manual" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});

function jsonResponse(body: unknown, status = 201): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
