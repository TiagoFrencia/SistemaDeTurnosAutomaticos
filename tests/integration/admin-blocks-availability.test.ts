import { describe, expect, it } from "vitest";
import {
  createAdminAvailabilityBlock,
  createAdminProfessional,
  createAdminService,
  replaceAdminBusinessHours
} from "@/lib/admin/admin-agenda-service";
import { buildPublicAvailabilityResponse } from "@/lib/public/public-availability-service";
import { FakeAdminAgendaRepository } from "@/tests/helpers/fake-admin-agenda-repository";

describe("admin availability blocks", () => {
  it("hides professional-specific blocked slots from public availability", async () => {
    const repository = new FakeAdminAgendaRepository();
    const { serviceId, professionalId } = await seedAgenda(repository);

    await createAdminAvailabilityBlock(repository, {
      businessSlug: "achul-nails",
      professionalId,
      startAt: "2026-06-01T09:00:00-03:00",
      endAt: "2026-06-01T10:00:00-03:00",
      reason: "Capacitacion"
    });

    const availability = await buildPublicAvailabilityResponse(repository.publicRepository(), {
      businessSlug: "achul-nails",
      serviceId,
      professionalId,
      from: "2026-06-01T00:00:00-03:00",
      to: "2026-06-02T00:00:00-03:00"
    });

    expect(availability.slots.map((slot) => slot.startAt)).toEqual([
      "2026-06-01T10:00:00.000-03:00",
      "2026-06-01T11:00:00.000-03:00"
    ]);
  });

  it("hides globally blocked slots from every professional", async () => {
    const repository = new FakeAdminAgendaRepository();
    const { serviceId, professionalId } = await seedAgenda(repository);

    await createAdminAvailabilityBlock(repository, {
      businessSlug: "achul-nails",
      startAt: "2026-06-01T10:00:00-03:00",
      endAt: "2026-06-01T11:00:00-03:00",
      reason: "Feriado interno"
    });

    const availability = await buildPublicAvailabilityResponse(repository.publicRepository(), {
      businessSlug: "achul-nails",
      serviceId,
      professionalId,
      from: "2026-06-01T00:00:00-03:00",
      to: "2026-06-02T00:00:00-03:00"
    });

    expect(availability.slots.map((slot) => slot.startAt)).toEqual([
      "2026-06-01T09:00:00.000-03:00",
      "2026-06-01T11:00:00.000-03:00"
    ]);
  });
});

async function seedAgenda(repository: FakeAdminAgendaRepository) {
  const service = await createAdminService(repository, {
    businessSlug: "achul-nails",
    name: "Manicure semipermanente",
    durationMinutes: 60,
    priceAmount: 5000,
    depositType: "fixed",
    depositValue: 1500
  });
  const professional = await createAdminProfessional(repository, {
    businessSlug: "achul-nails",
    name: "Azul"
  });
  await replaceAdminBusinessHours(repository, {
    businessSlug: "achul-nails",
    professionalId: professional.id,
    hours: [{ dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }]
  });

  return { serviceId: service.id, professionalId: professional.id };
}
