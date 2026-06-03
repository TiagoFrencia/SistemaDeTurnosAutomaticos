import { describe, expect, it } from "vitest";
import { updateAdminBranding, type AdminAgendaRepository } from "@/lib/admin/admin-agenda-service";

describe("admin branding service", () => {
  it("normalizes an empty logo URL to null", async () => {
    const repository = fakeRepository();

    const branding = await updateAdminBranding(repository, {
      businessSlug: "achul-nails",
      primaryColor: "#24594c",
      themePreset: "editorial_green",
      heroText: "Turnos confirmados para que tu horario quede cuidado desde el primer clic.",
      visualMode: "default",
      logoUrl: ""
    });

    expect(branding.logoUrl).toBeNull();
  });

  it("keeps a valid logo URL", async () => {
    const repository = fakeRepository();

    const branding = await updateAdminBranding(repository, {
      businessSlug: "achul-nails",
      primaryColor: "#24594c",
      themePreset: "soft_rose",
      heroText: "Turnos confirmados para que tu horario quede cuidado desde el primer clic.",
      visualMode: "default",
      logoUrl: "https://example.com/logo.png"
    });

    expect(branding.logoUrl).toBe("https://example.com/logo.png");
  });

  it("rejects invalid theme presets", async () => {
    await expect(
      updateAdminBranding(fakeRepository(), {
        businessSlug: "achul-nails",
        primaryColor: "#24594c",
        themePreset: "neon_bad" as never,
        heroText: "Turnos confirmados para que tu horario quede cuidado desde el primer clic.",
        visualMode: "default",
        logoUrl: null
      })
    ).rejects.toMatchObject({ code: "invalid_request" });
  });
});

function fakeRepository(): AdminAgendaRepository {
  return {
    findBusinessBySlug: async () => ({
      id: "business-1",
      name: "Achul_Nails",
      slug: "achul-nails",
      address: null,
      active: true
    }),
    listAgenda: async () => {
      throw new Error("Not used");
    },
    createService: async () => {
      throw new Error("Not used");
    },
    updateService: async () => {
      throw new Error("Not used");
    },
    createProfessional: async () => {
      throw new Error("Not used");
    },
    updateProfessional: async () => {
      throw new Error("Not used");
    },
    replaceBusinessHours: async () => {
      throw new Error("Not used");
    },
    createAvailabilityBlock: async () => {
      throw new Error("Not used");
    },
    upsertBranding: async (input) => ({
      primaryColor: input.primaryColor,
      themePreset: input.themePreset,
      heroText: input.heroText,
      visualMode: input.visualMode,
      logoUrl: input.logoUrl
    })
  };
}
