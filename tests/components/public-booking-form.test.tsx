/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicBookingForm } from "@/components/booking/public-booking-form";
import type { PublicAvailabilityResponse } from "@/lib/public/public-availability-service";

const firstServiceId = "22222222-2222-4222-8222-222222222222";
const secondServiceId = "22222222-2222-4222-8222-222222222223";
const firstProfessionalId = "33333333-3333-4333-8333-333333333333";
const secondProfessionalId = "33333333-3333-4333-8333-333333333334";

describe("PublicBookingForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refetches availability when services or professional change and submits the selected values", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith("/api/public/businesses/achul-nails/availability")) {
        return jsonResponse(
          availability({
            selectedServiceId: firstServiceId,
            selectedServiceIds: [firstServiceId, secondServiceId],
            selectedProfessionalId: secondProfessionalId
          })
        );
      }

      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        businessSlug: "achul-nails",
        serviceIds: [firstServiceId, secondServiceId],
        professionalId: secondProfessionalId,
        startAt: "2026-06-02T10:30:00-03:00",
        customer: {
          fullName: "Ana Perez",
          phone: "+5491111111111",
          email: "ana@example.com"
        }
      });

      return jsonResponse({ error: "No pudimos iniciar la reserva." }, 400);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PublicBookingForm availability={availability()} businessSlug="achul-nails" />);

    fireEvent.click(screen.getByLabelText(/Kapping gel/i));
    fireEvent.change(screen.getByLabelText("Profesional"), { target: { value: secondProfessionalId } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /10:30/i })).toHaveAttribute("aria-pressed", "true");
    });

    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana Perez" } });
    fireEvent.change(screen.getByLabelText("WhatsApp"), { target: { value: "+5491111111111" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar a Mercado Pago" }));

    await screen.findByText("No pudimos iniciar la reserva.");
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("serviceIds=" + secondServiceId))).toBe(
      true
    );
  });

  it("updates the selected slot when a customer chooses another time", () => {
    render(<PublicBookingForm availability={availability()} businessSlug="achul-nails" />);

    expect(screen.getByText("junio de 2026")).toBeInTheDocument();
    expect(screen.getByText("LU")).toBeInTheDocument();
    expect(screen.getByText("MA")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /lunes, 1 de junio.*2 turnos/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: /martes, 2 de junio.*sin turnos/i })).toBeDisabled();
    expect(screen.getByText("Elegí un día")).toBeInTheDocument();
    expect(screen.getByText("Elegí un horario")).toBeInTheDocument();

    const slots = screen.getByLabelText("Selector de horarios disponibles");
    const secondSlot = within(slots).getByRole("button", { name: /lun 01 10:00/i });
    fireEvent.click(secondSlot);

    expect(secondSlot).toHaveAttribute("aria-pressed", "true");
  });

  it("navigates between available months and filters slots by selected day", () => {
    render(
      <PublicBookingForm
        availability={{
          ...availability(),
          slots: [
            {
              startAt: "2026-06-30T09:00:00-03:00",
              endAt: "2026-06-30T10:00:00-03:00"
            },
            {
              startAt: "2026-07-01T11:00:00-03:00",
              endAt: "2026-07-01T12:00:00-03:00"
            }
          ]
        }}
        businessSlug="achul-nails"
      />
    );

    expect(screen.getByText("junio de 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /martes, 30 de junio.*1 turno/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /11:00/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByText("julio de 2026")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /miércoles, 1 de julio.*1 turno/i }));
    expect(screen.getByRole("button", { name: /11:00/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: /09:00/i })).not.toBeInTheDocument();
  });

  it("disables submit and shows an empty state when no slots are available", () => {
    render(<PublicBookingForm availability={{ ...availability(), slots: [] }} businessSlug="achul-nails" />);

    expect(screen.getByText("No hay horarios disponibles para esta selección.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar a Mercado Pago" })).toBeDisabled();
  });
});

function availability(
  overrides: Partial<
    Pick<PublicAvailabilityResponse, "selectedServiceId" | "selectedServiceIds" | "selectedProfessionalId" | "slots">
  > = {}
): PublicAvailabilityResponse {
  const selectedServiceId = overrides.selectedServiceId ?? firstServiceId;
  const selectedServiceIds = overrides.selectedServiceIds ?? [selectedServiceId];
  const selectedProfessionalId = overrides.selectedProfessionalId ?? firstProfessionalId;
  const services = [
    {
      id: firstServiceId,
      name: "Manicure semipermanente",
      durationMinutes: 60,
      priceAmount: 5000,
      depositAmount: 1500
    },
    {
      id: secondServiceId,
      name: "Kapping gel",
      durationMinutes: 90,
      priceAmount: 8000,
      depositAmount: 2500
    }
  ];

  return {
    business: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Achul_Nails",
      slug: "achul-nails",
      address: "Dirección a confirmar",
      branding: {
        primaryColor: "#24594c",
        themePreset: "editorial_green",
        heroText: "Turnos confirmados para que tu horario quede cuidado desde el primer clic.",
        visualMode: "default",
        logoUrl: null
      }
    },
    service:
      selectedServiceIds.length > 1
        ? {
            id: selectedServiceIds[0],
            name: "2 servicios",
            durationMinutes: 150,
            priceAmount: 13000,
            depositAmount: 4000
          }
        : services.find((service) => service.id === selectedServiceId) ?? services[0],
    services,
    selectedServices: services.filter((service) => selectedServiceIds.includes(service.id)),
    selectedServiceId,
    selectedServiceIds,
    professionals: [
      { id: firstProfessionalId, name: "Azul" },
      { id: secondProfessionalId, name: "Luna" }
    ],
    selectedProfessionalId,
    slots:
      overrides.slots ??
      (selectedServiceId === secondServiceId || selectedProfessionalId === secondProfessionalId
        ? [
            {
              startAt: "2026-06-02T10:30:00-03:00",
              endAt: "2026-06-02T12:00:00-03:00"
            }
          ]
        : [
            {
              startAt: "2026-06-01T09:00:00-03:00",
              endAt: "2026-06-01T10:00:00-03:00"
            },
            {
              startAt: "2026-06-01T10:00:00-03:00",
              endAt: "2026-06-01T11:00:00-03:00"
            }
          ])
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
