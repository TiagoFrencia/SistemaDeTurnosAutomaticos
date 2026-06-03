import { describe, expect, it } from "vitest";
import {
  AdminAgendaError,
  createAdminProfessional,
  createAdminService,
  getAdminAgenda,
  replaceAdminBusinessHours
} from "@/lib/admin/admin-agenda-service";
import { buildPublicAvailabilityResponse } from "@/lib/public/public-availability-service";
import { FakeAdminAgendaRepository } from "@/tests/helpers/fake-admin-agenda-repository";

describe("admin agenda configuration", () => {
  it("creates services, professionals and hours that drive public availability", async () => {
    const repository = new FakeAdminAgendaRepository();

    const service = await createAdminService(repository, {
      businessSlug: "achul-nails",
      name: "Kapping gel",
      description: "Refuerzo con gel",
      durationMinutes: 60,
      priceAmount: 8000,
      depositType: "fixed",
      depositValue: 2500,
      active: true
    });
    const professional = await createAdminProfessional(repository, {
      businessSlug: "achul-nails",
      name: "Luna",
      bio: "Especialista en nail art",
      active: true
    });

    await replaceAdminBusinessHours(repository, {
      businessSlug: "achul-nails",
      professionalId: professional.id,
      hours: [
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
          active: true
        }
      ]
    });

    const agenda = await getAdminAgenda(repository, { businessSlug: "achul-nails" });
    expect(agenda.services).toContainEqual(expect.objectContaining({ id: service.id, name: "Kapping gel" }));
    expect(agenda.professionals).toContainEqual(
      expect.objectContaining({ id: professional.id, name: "Luna" })
    );
    expect(agenda.businessHours).toEqual([
      expect.objectContaining({ professionalId: professional.id, dayOfWeek: 1, startTime: "09:00" })
    ]);

    const availability = await buildPublicAvailabilityResponse(repository.publicRepository(), {
      businessSlug: "achul-nails",
      serviceId: service.id,
      professionalId: professional.id,
      from: "2026-06-01T00:00:00-03:00",
      to: "2026-06-02T00:00:00-03:00"
    });

    expect(availability.service.name).toBe("Kapping gel");
    expect(availability.selectedProfessionalId).toBe(professional.id);
    expect(availability.slots.map((slot) => slot.startAt)).toEqual([
      "2026-06-01T09:00:00.000-03:00",
      "2026-06-01T10:00:00.000-03:00",
      "2026-06-01T11:00:00.000-03:00"
    ]);
  });

  it("rejects invalid service deposits and invalid weekly hours", async () => {
    const repository = new FakeAdminAgendaRepository();

    await expect(
      createAdminService(repository, {
        businessSlug: "achul-nails",
        name: "Manicure",
        durationMinutes: 60,
        priceAmount: 5000,
        depositType: "fixed",
        depositValue: 6000
      })
    ).rejects.toMatchObject({ code: "invalid_request" satisfies AdminAgendaError["code"] });

    await expect(
      createAdminService(repository, {
        businessSlug: "achul-nails",
        name: "Manicure",
        durationMinutes: 60,
        priceAmount: 5000,
        depositType: "percentage",
        depositValue: 120
      })
    ).rejects.toMatchObject({ code: "invalid_request" satisfies AdminAgendaError["code"] });

    await expect(
      replaceAdminBusinessHours(repository, {
        businessSlug: "achul-nails",
        hours: [{ dayOfWeek: 1, startTime: "18:00", endTime: "09:00" }]
      })
    ).rejects.toMatchObject({ code: "invalid_request" satisfies AdminAgendaError["code"] });
  });
});
