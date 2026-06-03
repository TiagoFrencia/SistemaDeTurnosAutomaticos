import { describe, expect, it } from "vitest";
import {
  createManualAppointment,
  handleManualAppointmentRequest,
  type ManualAppointmentRepository
} from "@/lib/admin/manual-appointment-service";
import { buildPublicAvailabilityResponse } from "@/lib/public/public-availability-service";

const business = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "achul-nails",
  name: "Achul_Nails",
  address: "Direccion a confirmar",
  active: true,
  branding: {
    primaryColor: "#24594c",
    themePreset: "editorial_green" as const,
    heroText: "Turnos confirmados para que tu horario quede cuidado desde el primer clic.",
    visualMode: "default" as const,
    logoUrl: null
  }
};

describe("manual appointment admin flow", () => {
  it("rejects manual appointment requests without an admin token", async () => {
    const repository = new FakeManualAppointmentRepository();

    const response = await handleManualAppointmentRequest({
      request: new Request("http://localhost/api/admin/appointments/manual", {
        method: "POST",
        body: JSON.stringify(validPayload({ depositMode: "none" }))
      }),
      repository,
      adminApiKey: "secret"
    });

    expect(response.status).toBe(401);
    expect(repository.appointments).toHaveLength(0);
  });

  it("creates a no-deposit manual appointment and blocks the slot", async () => {
    const repository = new FakeManualAppointmentRepository();

    const appointment = await createManualAppointment(repository, validPayload({ depositMode: "none" }));

    expect(appointment).toMatchObject({
      status: "confirmed",
      source: "manual",
      depositRequired: false,
      totalAmount: 5000,
      depositAmount: 0,
      remainingAmount: 5000
    });
    expect(repository.payments).toHaveLength(0);

    const availability = await buildPublicAvailabilityResponse(repository.publicRepository(), {
      businessSlug: "achul-nails",
      serviceId: "service-1",
      professionalId: "professional-1",
      from: "2026-06-01T00:00:00-03:00",
      to: "2026-06-02T00:00:00-03:00"
    });

    expect(availability.slots.map((slot) => slot.startAt)).not.toContain("2026-06-01T09:00:00.000-03:00");
  });

  it("creates a cash-deposit manual appointment with an approved cash payment", async () => {
    const repository = new FakeManualAppointmentRepository();

    const appointment = await createManualAppointment(repository, validPayload({ depositMode: "cash" }));

    expect(appointment).toMatchObject({
      depositRequired: true,
      totalAmount: 5000,
      depositAmount: 1500,
      remainingAmount: 3500
    });
    expect(repository.payments).toEqual([
      expect.objectContaining({
        appointmentId: appointment.id,
        provider: "cash",
        status: "approved",
        amount: 1500
      })
    ]);
  });

  it("creates a multi-service manual appointment with summed cash deposit", async () => {
    const repository = new FakeManualAppointmentRepository();

    const appointment = await createManualAppointment(repository, {
      ...validPayload({ depositMode: "cash" }),
      serviceIds: ["service-1", "service-2"],
      serviceId: undefined
    });

    expect(appointment).toMatchObject({
      endAt: "2026-06-01T11:00:00.000-03:00",
      totalAmount: 13000,
      depositAmount: 4000,
      remainingAmount: 9000
    });
    expect(repository.appointmentServices).toEqual([
      expect.objectContaining({ appointmentId: appointment.id, serviceId: "service-1", position: 1 }),
      expect.objectContaining({ appointmentId: appointment.id, serviceId: "service-2", position: 2 })
    ]);
    expect(repository.payments).toEqual([expect.objectContaining({ amount: 4000 })]);
  });

  it("returns a conflict when the selected slot is already occupied", async () => {
    const repository = new FakeManualAppointmentRepository();
    await createManualAppointment(repository, validPayload({ depositMode: "none" }));

    await expect(createManualAppointment(repository, validPayload({ depositMode: "cash" }))).rejects.toMatchObject({
      code: "slot_unavailable"
    });
  });
});

function validPayload(overrides: { depositMode: "none" | "cash" }) {
  return {
    businessSlug: "achul-nails",
    serviceId: "service-1",
    professionalId: "professional-1",
    startAt: "2026-06-01T09:00:00-03:00",
    depositMode: overrides.depositMode,
    customer: {
      fullName: "Ana Perez",
      phone: "+5491111111111",
      email: "ana@example.com"
    },
    notes: "Reserva por telefono"
  };
}

class FakeManualAppointmentRepository implements ManualAppointmentRepository {
  appointments: Array<{
    id: string;
    businessId: string;
    professionalId: string;
    serviceId: string;
    customerId: string;
    startAt: string;
    endAt: string;
    status: "confirmed";
    source: "manual";
    depositRequired: boolean;
    totalAmount: number;
    depositAmount: number;
    remainingAmount: number;
    notes: string | null;
  }> = [];
  payments: Array<{
    businessId: string;
    appointmentId: string;
    provider: "cash";
    status: "approved";
    amount: number;
    currency: "ARS";
  }> = [];
  appointmentServices: Array<{
    appointmentId: string;
    serviceId: string;
    position: number;
    priceAmount: number;
    depositAmount: number;
    durationMinutes: number;
  }> = [];
  customers = new Map<string, { id: string; fullName: string; phone: string; email: string | null }>();
  nextId = 1;

  async findBusinessBySlug(slug: string) {
    return slug === business.slug ? business : null;
  }

  async findActiveService(input: { businessId: string; serviceId: string }) {
    if (input.businessId !== business.id) return null;
    const services = {
      "service-1": {
          id: "service-1",
          businessId: business.id,
          name: "Manicure",
          durationMinutes: 60,
          priceAmount: 5000,
          depositType: "fixed" as const,
          depositValue: 1500,
          active: true
        },
      "service-2": {
        id: "service-2",
        businessId: business.id,
        name: "Kapping",
        durationMinutes: 60,
        priceAmount: 8000,
        depositType: "fixed" as const,
        depositValue: 2500,
        active: true
      }
    };

    return services[input.serviceId as keyof typeof services] ?? null;
  }

  async findActiveProfessional(input: { businessId: string; professionalId: string }) {
    return input.businessId === business.id && input.professionalId === "professional-1"
      ? { id: "professional-1", businessId: business.id, name: "Azul", active: true }
      : null;
  }

  async upsertCustomer(input: {
    businessId: string;
    fullName: string;
    phone: string;
    email: string | null;
  }) {
    const existing = this.customers.get(input.phone);
    if (existing) {
      Object.assign(existing, input);
      return existing;
    }

    const customer = { id: this.id(), fullName: input.fullName, phone: input.phone, email: input.email };
    this.customers.set(input.phone, customer);
    return customer;
  }

  async createAppointment(input: Omit<FakeManualAppointmentRepository["appointments"][number], "id">) {
    const overlaps = this.appointments.some(
      (appointment) =>
        appointment.businessId === input.businessId &&
        appointment.professionalId === input.professionalId &&
        appointment.status === "confirmed" &&
        input.startAt < appointment.endAt &&
        input.endAt > appointment.startAt
    );

    if (overlaps) {
      const error = new Error("slot taken") as Error & { code: string };
      error.code = "23P01";
      throw error;
    }

    const appointment = { id: this.id(), ...input };
    this.appointments.push(appointment);
    return appointment;
  }

  async createCashPayment(input: FakeManualAppointmentRepository["payments"][number]) {
    this.payments.push(input);
  }

  async recordAppointmentServices(input: {
    appointmentId: string;
    services: Array<{
      serviceId: string;
      position: number;
      priceAmount: number;
      depositAmount: number;
      durationMinutes: number;
    }>;
  }) {
    this.appointmentServices.push(
      ...input.services.map((service) => ({ appointmentId: input.appointmentId, ...service }))
    );
  }

  publicRepository() {
    return {
      load: async () => ({
        business,
        services: [
          {
            id: "service-1",
            name: "Manicure",
            durationMinutes: 60,
            priceAmount: 5000,
            depositAmount: 1500,
            active: true
          }
        ],
        professionals: [{ id: "professional-1", name: "Azul", active: true }],
        businessHours: [{ dayOfWeek: 1, startTime: "09:00", endTime: "11:00" }],
        appointments: this.appointments.map((appointment) => ({
          professionalId: appointment.professionalId,
          startAt: appointment.startAt,
          endAt: appointment.endAt,
          status: appointment.status
        })),
        blocks: []
      })
    };
  }

  private id(): string {
    return `id-${this.nextId++}`;
  }
}
