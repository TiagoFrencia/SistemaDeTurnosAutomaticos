import { describe, expect, it } from "vitest";
import {
  buildPublicAvailabilityResponse,
  type PublicAvailabilityData,
  type PublicAvailabilityRepository
} from "@/lib/public/public-availability-service";

const businessId = "11111111-1111-4111-8111-111111111111";
const serviceId = "22222222-2222-4222-8222-222222222222";
const secondServiceId = "22222222-2222-4222-8222-222222222223";
const professionalId = "33333333-3333-4333-8333-333333333333";
const secondProfessionalId = "33333333-3333-4333-8333-333333333334";

function repository(overrides: Partial<PublicAvailabilityData> = {}) {
  const base: PublicAvailabilityData = {
    business: {
      id: businessId,
      name: "Achul_Nails",
      slug: "achul-nails",
      address: "Direccion a confirmar",
      active: true,
      branding: {
        primaryColor: "#24594c",
        themePreset: "editorial_green",
        heroText: "Turnos confirmados para que tu horario quede cuidado desde el primer clic.",
        visualMode: "default",
        logoUrl: null
      }
    },
    services: [
      {
        id: serviceId,
        name: "Manicure semipermanente",
        durationMinutes: 60,
        priceAmount: 5000,
        depositAmount: 1500,
        active: true
      },
      {
        id: secondServiceId,
        name: "Kapping gel",
        durationMinutes: 90,
        priceAmount: 8000,
        depositAmount: 2500,
        active: true
      },
      {
        id: "22222222-2222-4222-8222-222222222224",
        name: "Soft gel inactivo",
        durationMinutes: 120,
        priceAmount: 10000,
        depositAmount: 3000,
        active: false
      }
    ],
    professionals: [
      { id: professionalId, name: "Azul", active: true },
      { id: secondProfessionalId, name: "Luna", active: true },
      { id: "33333333-3333-4333-8333-333333333335", name: "Inactiva", active: false }
    ],
    businessHours: [{ dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }],
    appointments: [],
    blocks: []
  };

  return {
    load: async () => ({ ...base, ...overrides })
  } satisfies PublicAvailabilityRepository;
}

describe("public availability contract", () => {
  it("returns business, service, single professional selection, and available slots", async () => {
    const response = await buildPublicAvailabilityResponse(repository(), {
      businessSlug: "achul-nails",
      serviceId,
      from: "2026-06-01T09:00:00-03:00",
      to: "2026-06-01T12:00:00-03:00"
    });

    expect(response).toMatchObject({
      business: {
        id: businessId,
        name: "Achul_Nails",
        slug: "achul-nails",
        address: "Direccion a confirmar"
      },
      service: {
        id: serviceId,
        name: "Manicure semipermanente",
        durationMinutes: 60,
        priceAmount: 5000,
        depositAmount: 1500
      },
      services: [
        {
          id: serviceId,
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
      ],
      selectedServiceId: serviceId,
      professionals: [
        { id: professionalId, name: "Azul" },
        { id: secondProfessionalId, name: "Luna" }
      ],
      selectedProfessionalId: professionalId
    });
    expect(response.slots).toHaveLength(3);
  });

  it("uses requested active service and professional selections", async () => {
    const response = await buildPublicAvailabilityResponse(repository(), {
      businessSlug: "achul-nails",
      serviceId: secondServiceId,
      professionalId: secondProfessionalId,
      from: "2026-06-01T09:00:00-03:00",
      to: "2026-06-01T12:00:00-03:00"
    });

    expect(response.service).toMatchObject({
      id: secondServiceId,
      name: "Kapping gel",
      durationMinutes: 90
    });
    expect(response.selectedServiceId).toBe(secondServiceId);
    expect(response.selectedProfessionalId).toBe(secondProfessionalId);
    expect(response.slots).toHaveLength(2);
  });

  it("uses selected services as one consecutive duration and returns combined totals", async () => {
    const response = await buildPublicAvailabilityResponse(repository(), {
      businessSlug: "achul-nails",
      serviceIds: [serviceId, secondServiceId],
      from: "2026-06-01T09:00:00-03:00",
      to: "2026-06-01T12:00:00-03:00"
    });

    expect(response.selectedServiceIds).toEqual([serviceId, secondServiceId]);
    expect(response.selectedServices.map((service) => service.name)).toEqual([
      "Manicure semipermanente",
      "Kapping gel"
    ]);
    expect(response.service).toMatchObject({
      name: "2 servicios",
      durationMinutes: 150,
      priceAmount: 13000,
      depositAmount: 4000
    });
    expect(response.slots).toEqual([
      {
        startAt: "2026-06-01T09:00:00.000-03:00",
        endAt: "2026-06-01T11:30:00.000-03:00"
      }
    ]);
  });

  it("excludes pending_payment and confirmed appointments from slots", async () => {
    const response = await buildPublicAvailabilityResponse(
      repository({
        appointments: [
          {
            professionalId,
            startAt: "2026-06-01T09:00:00-03:00",
            endAt: "2026-06-01T10:00:00-03:00",
            status: "pending_payment"
          },
          {
            professionalId,
            startAt: "2026-06-01T10:00:00-03:00",
            endAt: "2026-06-01T11:00:00-03:00",
            status: "confirmed"
          }
        ]
      }),
      {
        businessSlug: "achul-nails",
        serviceId,
        from: "2026-06-01T09:00:00-03:00",
        to: "2026-06-01T12:00:00-03:00"
      }
    );

    expect(response.slots).toEqual([
      {
        startAt: "2026-06-01T11:00:00.000-03:00",
        endAt: "2026-06-01T12:00:00.000-03:00"
      }
    ]);
  });

  it("returns not_found for missing or inactive businesses", async () => {
    await expect(
      buildPublicAvailabilityResponse(repository({ business: null }), {
        businessSlug: "missing",
        serviceId,
        from: "2026-06-01T09:00:00-03:00",
        to: "2026-06-01T12:00:00-03:00"
      })
    ).rejects.toMatchObject({ code: "not_found" });

    await expect(
      buildPublicAvailabilityResponse(
        repository({
          business: {
            id: businessId,
            name: "Achul_Nails",
            slug: "achul-nails",
            address: "Direccion a confirmar",
            active: false,
            branding: {
              primaryColor: "#24594c",
              themePreset: "editorial_green",
              heroText: "Turnos confirmados para que tu horario quede cuidado desde el primer clic.",
              visualMode: "default",
              logoUrl: null
            }
          }
        }),
        {
          businessSlug: "achul-nails",
          serviceId,
          from: "2026-06-01T09:00:00-03:00",
          to: "2026-06-01T12:00:00-03:00"
        }
      )
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
