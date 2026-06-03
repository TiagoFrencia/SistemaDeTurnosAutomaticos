import type { AdminAgendaRepository, AdminBusinessBranding } from "@/lib/admin/admin-agenda-service";
import type { PublicAvailabilityRepository } from "@/lib/public/public-availability-service";

const business = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Achul_Nails",
  slug: "achul-nails",
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

type Service = Awaited<ReturnType<AdminAgendaRepository["createService"]>>;
type Professional = Awaited<ReturnType<AdminAgendaRepository["createProfessional"]>>;
type BusinessHour = Awaited<ReturnType<AdminAgendaRepository["replaceBusinessHours"]>>[number];
type Block = Awaited<ReturnType<AdminAgendaRepository["createAvailabilityBlock"]>>;

export class FakeAdminAgendaRepository implements AdminAgendaRepository {
  services: Service[] = [];
  professionals: Professional[] = [];
  businessHours: BusinessHour[] = [];
  blocks: Block[] = [];
  branding: AdminBusinessBranding = business.branding;
  private nextId = 1;

  async findBusinessBySlug(slug: string) {
    return slug === business.slug ? business : null;
  }

  async listAgenda() {
    return {
      business,
      branding: this.branding,
      services: this.services,
      professionals: this.professionals,
      businessHours: this.businessHours,
      availabilityBlocks: this.blocks
    };
  }

  async createService(input: Parameters<AdminAgendaRepository["createService"]>[0]) {
    const service = {
      id: this.id(),
      businessId: input.businessId,
      name: input.name,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes,
      priceAmount: input.priceAmount,
      depositType: input.depositType,
      depositValue: input.depositValue,
      depositAmount:
        input.depositType === "percentage"
          ? Math.round((input.priceAmount * input.depositValue) / 100)
          : input.depositValue,
      active: input.active ?? true
    };
    this.services.push(service);
    return service;
  }

  async updateService(input: Parameters<AdminAgendaRepository["updateService"]>[0]) {
    const service = this.services.find((candidate) => candidate.id === input.serviceId);
    if (!service) {
      return null;
    }
    Object.assign(service, input.patch);
    service.depositAmount =
      service.depositType === "percentage"
        ? Math.round((service.priceAmount * service.depositValue) / 100)
        : service.depositValue;
    return service;
  }

  async createProfessional(input: Parameters<AdminAgendaRepository["createProfessional"]>[0]) {
    const professional = {
      id: this.id(),
      businessId: input.businessId,
      name: input.name,
      bio: input.bio ?? null,
      active: input.active ?? true
    };
    this.professionals.push(professional);
    return professional;
  }

  async updateProfessional(input: Parameters<AdminAgendaRepository["updateProfessional"]>[0]) {
    const professional = this.professionals.find((candidate) => candidate.id === input.professionalId);
    if (!professional) {
      return null;
    }
    Object.assign(professional, input.patch);
    return professional;
  }

  async replaceBusinessHours(input: Parameters<AdminAgendaRepository["replaceBusinessHours"]>[0]) {
    this.businessHours = this.businessHours.filter(
      (hour) => hour.professionalId !== (input.professionalId ?? null)
    );
    const rows = input.hours.map((hour) => ({
      id: this.id(),
      businessId: input.businessId,
      professionalId: input.professionalId ?? null,
      dayOfWeek: hour.dayOfWeek,
      startTime: hour.startTime,
      endTime: hour.endTime,
      active: hour.active ?? true
    }));
    this.businessHours.push(...rows);
    return rows;
  }

  async createAvailabilityBlock(input: Parameters<AdminAgendaRepository["createAvailabilityBlock"]>[0]) {
    const block = {
      id: this.id(),
      businessId: input.businessId,
      professionalId: input.professionalId ?? null,
      startAt: input.startAt,
      endAt: input.endAt,
      reason: input.reason ?? null
    };
    this.blocks.push(block);
    return block;
  }

  async upsertBranding(input: Parameters<AdminAgendaRepository["upsertBranding"]>[0]) {
    this.branding = {
      primaryColor: input.primaryColor,
      themePreset: input.themePreset,
      heroText: input.heroText,
      visualMode: input.visualMode,
      logoUrl: input.logoUrl
    };
    return this.branding;
  }

  publicRepository(): PublicAvailabilityRepository {
    return {
      load: async () => ({
        business: {
          ...business,
          branding: this.branding
        },
        services: this.services.map((service) => ({
          id: service.id,
          name: service.name,
          durationMinutes: service.durationMinutes,
          priceAmount: service.priceAmount,
          depositAmount: service.depositAmount,
          active: service.active
        })),
        professionals: this.professionals.map((professional) => ({
          id: professional.id,
          name: professional.name,
          active: professional.active
        })),
        businessHours: this.businessHours
          .filter((hour) => hour.active)
          .map((hour) => ({
            dayOfWeek: hour.dayOfWeek,
            startTime: hour.startTime,
            endTime: hour.endTime
          })),
        appointments: [],
        blocks: this.blocks.map((block) => ({
          professionalId: block.professionalId,
          startAt: block.startAt,
          endAt: block.endAt
        }))
      })
    };
  }

  private id(): string {
    return `00000000-0000-4000-8000-${String(this.nextId++).padStart(12, "0")}`;
  }
}
