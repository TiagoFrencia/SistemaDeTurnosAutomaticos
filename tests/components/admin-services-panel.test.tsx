/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminServicesPanel } from "@/components/admin/admin-services-panel";

describe("AdminServicesPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a service and adds it to the list", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        name: "Kapping gel",
        durationMinutes: 90,
        priceAmount: 8000,
        depositType: "fixed",
        depositValue: 2500
      });

      return jsonResponse({
        id: "service-2",
        businessId: "biz-1",
        name: "Kapping gel",
        description: "Refuerzo",
        durationMinutes: 90,
        priceAmount: 8000,
        depositType: "fixed",
        depositValue: 2500,
        depositAmount: 2500,
        active: true
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminServicesPanel businessSlug="achul-nails" services={[]} />);

    fireEvent.change(screen.getByLabelText("Nombre del servicio"), { target: { value: "Kapping gel" } });
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Refuerzo" } });
    fireEvent.change(screen.getByLabelText("Duración"), { target: { value: "90" } });
    fireEvent.change(screen.getByLabelText("Precio"), { target: { value: "8000" } });
    fireEvent.change(screen.getByLabelText("Monto de seña"), { target: { value: "2500" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar servicio" }));

    expect((await screen.findAllByText("Kapping gel")).length).toBeGreaterThan(0);
    expect(screen.getByText((text) => text.includes("$8.000"))).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("shows percentage guidance when deposit type is percentage", () => {
    render(<AdminServicesPanel businessSlug="achul-nails" services={[]} />);

    fireEvent.change(screen.getByLabelText("Tipo de seña"), { target: { value: "percentage" } });

    expect(screen.getByLabelText("Porcentaje de seña")).toHaveAttribute("max", "100");
    expect(screen.getByText("Ejemplo: 30 significa 30% del precio total.")).toBeInTheDocument();
  });

  it("filters services by active and paused state from the mobile chips", () => {
    render(
      <AdminServicesPanel
        businessSlug="achul-nails"
        services={[
          service({ id: "service-1", name: "Manicure semipermanente", active: true }),
          service({ id: "service-2", name: "Kapping gel", active: false })
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Pausados" }));

    expect(screen.queryByText("Manicure semipermanente")).not.toBeInTheDocument();
    expect(screen.getAllByText("Kapping gel").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Pausados" })).toHaveClass("active");

    fireEvent.click(screen.getByRole("button", { name: "Activos" }));

    expect(screen.getAllByText("Manicure semipermanente").length).toBeGreaterThan(0);
    expect(screen.queryByText("Kapping gel")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activos" })).toHaveClass("active");
  });
});

function service(overrides: { id: string; name: string; active: boolean }) {
  return {
    businessId: "biz-1",
    description: "",
    durationMinutes: 60,
    priceAmount: 5000,
    depositType: "fixed" as const,
    depositValue: 1500,
    depositAmount: 1500,
    ...overrides
  };
}

function jsonResponse(body: unknown, status = 201): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
