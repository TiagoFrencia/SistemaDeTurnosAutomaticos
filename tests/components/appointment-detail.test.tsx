/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppointmentDetail } from "@/components/admin/appointment-detail";

describe("AppointmentDetail", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows customer, appointment and balance details", () => {
    render(<AppointmentDetail appointment={appointment()} />);

    expect(screen.getByText("Ana Perez")).toBeInTheDocument();
    expect(screen.getByText("+5491111111111")).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("Manicure")).toBeInTheDocument();
    expect(screen.getByText("Azul")).toBeInTheDocument();
    expect(screen.getByText("Total: $5000")).toBeInTheDocument();
    expect(screen.getByText("Sena pagada: $1500")).toBeInTheDocument();
    expect(screen.getByText("Saldo restante: $3500")).toBeInTheDocument();
  });

  it("marks an appointment as attended", async () => {
    localStorage.setItem("ADMIN_API_KEY", "secret");
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(_input)).toBe("/api/admin/appointments/appointment-1/status");
      expect(init?.method).toBe("PATCH");
      expect(init?.headers).toMatchObject({ authorization: "Bearer secret" });
      expect(JSON.parse(String(init?.body))).toEqual({ status: "attended" });
      return jsonResponse({ appointment: { id: "appointment-1", status: "attended" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { reload: vi.fn() });

    render(<AppointmentDetail appointment={appointment()} />);

    fireEvent.click(screen.getByRole("button", { name: "Asistio" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("marks an appointment as no-show", async () => {
    localStorage.setItem("ADMIN_API_KEY", "secret");
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({ status: "no_show" });
      return jsonResponse({ appointment: { id: "appointment-1", status: "no_show" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { reload: vi.fn() });

    render(<AppointmentDetail appointment={appointment()} />);

    fireEvent.click(screen.getByRole("button", { name: "No asistio" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});

function appointment() {
  return {
    id: "appointment-1",
    start_at: "2026-06-01T09:00:00-03:00",
    end_at: "2026-06-01T10:00:00-03:00",
    status: "confirmed",
    total_amount: 5000,
    deposit_amount: 1500,
    remaining_amount: 3500,
    notes: "Llega 10 minutos antes",
    customer: { fullName: "Ana Perez", phone: "+5491111111111", email: "ana@example.com" },
    professional: { name: "Azul" },
    service: { name: "Manicure" }
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
