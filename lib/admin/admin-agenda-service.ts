import { isBrandingThemePreset, type BrandingThemePreset } from "@/lib/branding/theme";

export type AdminBusiness = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  active: boolean;
};

export type AdminBusinessBranding = {
  primaryColor: string;
  themePreset: BrandingThemePreset;
  heroText: string;
  visualMode: "default" | "compact";
  logoUrl: string | null;
};

export type AdminService = {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceAmount: number;
  depositType: "fixed" | "percentage";
  depositValue: number;
  depositAmount: number;
  active: boolean;
};

export type AdminProfessional = {
  id: string;
  businessId: string;
  name: string;
  bio: string | null;
  active: boolean;
};

export type AdminBusinessHour = {
  id: string;
  businessId: string;
  professionalId: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
};

export type AdminAvailabilityBlock = {
  id: string;
  businessId: string;
  professionalId: string | null;
  startAt: string;
  endAt: string;
  reason: string | null;
};

export type AdminAgenda = {
  business: AdminBusiness;
  branding: AdminBusinessBranding;
  services: AdminService[];
  professionals: AdminProfessional[];
  businessHours: AdminBusinessHour[];
  availabilityBlocks: AdminAvailabilityBlock[];
};

export type AdminServiceInput = {
  businessSlug: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  priceAmount: number;
  depositType: "fixed" | "percentage";
  depositValue: number;
  active?: boolean;
};

export type AdminProfessionalInput = {
  businessSlug: string;
  name: string;
  bio?: string | null;
  active?: boolean;
};

export type AdminBusinessHourInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active?: boolean;
};

export type AdminReplaceBusinessHoursInput = {
  businessSlug: string;
  professionalId?: string | null;
  hours: AdminBusinessHourInput[];
};

export type AdminAvailabilityBlockInput = {
  businessSlug: string;
  professionalId?: string | null;
  startAt: string;
  endAt: string;
  reason?: string | null;
};

export type AdminBrandingInput = {
  businessSlug: string;
  primaryColor: string;
  themePreset: BrandingThemePreset;
  heroText: string;
  visualMode: "default" | "compact";
  logoUrl?: string | null;
};

export type AdminAgendaRepository = {
  findBusinessBySlug(slug: string): Promise<AdminBusiness | null>;
  listAgenda(input: { businessId: string }): Promise<AdminAgenda>;
  createService(input: Omit<AdminServiceInput, "businessSlug"> & { businessId: string }): Promise<AdminService>;
  updateService(input: {
    businessId: string;
    serviceId: string;
    patch: Partial<Omit<AdminServiceInput, "businessSlug">>;
  }): Promise<AdminService | null>;
  createProfessional(
    input: Omit<AdminProfessionalInput, "businessSlug"> & { businessId: string }
  ): Promise<AdminProfessional>;
  updateProfessional(input: {
    businessId: string;
    professionalId: string;
    patch: Partial<Omit<AdminProfessionalInput, "businessSlug">>;
  }): Promise<AdminProfessional | null>;
  replaceBusinessHours(input: {
    businessId: string;
    professionalId?: string | null;
    hours: AdminBusinessHourInput[];
  }): Promise<AdminBusinessHour[]>;
  createAvailabilityBlock(
    input: Omit<AdminAvailabilityBlockInput, "businessSlug"> & { businessId: string }
  ): Promise<AdminAvailabilityBlock>;
  upsertBranding(input: AdminBusinessBranding & { businessId: string }): Promise<AdminBusinessBranding>;
};

export class AdminAgendaError extends Error {
  constructor(
    readonly code: "not_found" | "invalid_request",
    message: string
  ) {
    super(message);
    this.name = "AdminAgendaError";
  }
}

export async function getAdminAgenda(
  repository: AdminAgendaRepository,
  input: { businessSlug: string }
): Promise<AdminAgenda> {
  const business = await loadBusiness(repository, input.businessSlug);
  return repository.listAgenda({ businessId: business.id });
}

export async function createAdminService(
  repository: AdminAgendaRepository,
  input: AdminServiceInput
): Promise<AdminService> {
  validateServiceInput(input);
  const business = await loadBusiness(repository, input.businessSlug);
  return repository.createService({ ...input, businessId: business.id });
}

export async function updateAdminService(
  repository: AdminAgendaRepository,
  input: { businessSlug: string; serviceId: string; patch: Partial<Omit<AdminServiceInput, "businessSlug">> }
): Promise<AdminService> {
  validateServicePatch(input.patch);
  const business = await loadBusiness(repository, input.businessSlug);
  const service = await repository.updateService({
    businessId: business.id,
    serviceId: input.serviceId,
    patch: input.patch
  });

  if (!service) {
    throw new AdminAgendaError("not_found", "No se encontro el servicio para este negocio.");
  }

  return service;
}

export async function createAdminProfessional(
  repository: AdminAgendaRepository,
  input: AdminProfessionalInput
): Promise<AdminProfessional> {
  validateProfessionalInput(input);
  const business = await loadBusiness(repository, input.businessSlug);
  return repository.createProfessional({ ...input, businessId: business.id });
}

export async function updateAdminProfessional(
  repository: AdminAgendaRepository,
  input: {
    businessSlug: string;
    professionalId: string;
    patch: Partial<Omit<AdminProfessionalInput, "businessSlug">>;
  }
): Promise<AdminProfessional> {
  validateProfessionalPatch(input.patch);
  const business = await loadBusiness(repository, input.businessSlug);
  const professional = await repository.updateProfessional({
    businessId: business.id,
    professionalId: input.professionalId,
    patch: input.patch
  });

  if (!professional) {
    throw new AdminAgendaError("not_found", "No se encontro la profesional para este negocio.");
  }

  return professional;
}

export async function replaceAdminBusinessHours(
  repository: AdminAgendaRepository,
  input: AdminReplaceBusinessHoursInput
): Promise<AdminBusinessHour[]> {
  input.hours.forEach(validateBusinessHour);
  const business = await loadBusiness(repository, input.businessSlug);
  return repository.replaceBusinessHours({
    businessId: business.id,
    professionalId: input.professionalId ?? null,
    hours: input.hours
  });
}

export async function createAdminAvailabilityBlock(
  repository: AdminAgendaRepository,
  input: AdminAvailabilityBlockInput
): Promise<AdminAvailabilityBlock> {
  if (new Date(input.startAt).getTime() >= new Date(input.endAt).getTime()) {
    throw new AdminAgendaError("invalid_request", "El bloqueo debe terminar despues de comenzar.");
  }

  const business = await loadBusiness(repository, input.businessSlug);
  return repository.createAvailabilityBlock({
    ...input,
    businessId: business.id,
    professionalId: input.professionalId ?? null
  });
}

export async function updateAdminBranding(
  repository: AdminAgendaRepository,
  input: AdminBrandingInput
): Promise<AdminBusinessBranding> {
  validateBrandingInput(input);
  const business = await loadBusiness(repository, input.businessSlug);
  return repository.upsertBranding({
    businessId: business.id,
    primaryColor: input.primaryColor,
    themePreset: input.themePreset,
    heroText: input.heroText.trim(),
    visualMode: input.visualMode,
    logoUrl: normalizeLogoUrl(input.logoUrl)
  });
}

async function loadBusiness(
  repository: AdminAgendaRepository,
  businessSlug: string
): Promise<AdminBusiness> {
  const business = await repository.findBusinessBySlug(businessSlug);

  if (!business?.active) {
    throw new AdminAgendaError("not_found", "No se encontro el negocio activo.");
  }

  return business;
}

function validateServiceInput(input: AdminServiceInput): void {
  validateServicePatch(input);
  if (!input.name.trim()) {
    throw new AdminAgendaError("invalid_request", "El nombre del servicio es obligatorio.");
  }
  if (input.durationMinutes <= 0) {
    throw new AdminAgendaError("invalid_request", "La duracion debe ser mayor a cero.");
  }
  if (input.priceAmount < 0) {
    throw new AdminAgendaError("invalid_request", "El precio no puede ser negativo.");
  }
}

function validateServicePatch(input: Partial<Omit<AdminServiceInput, "businessSlug">>): void {
  const priceAmount = input.priceAmount;
  const depositType = input.depositType;
  const depositValue = input.depositValue;

  if (priceAmount !== undefined && priceAmount < 0) {
    throw new AdminAgendaError("invalid_request", "El precio no puede ser negativo.");
  }
  if (depositValue !== undefined && depositValue < 0) {
    throw new AdminAgendaError("invalid_request", "La sena no puede ser negativa.");
  }
  if (depositType === "percentage" && depositValue !== undefined && depositValue > 100) {
    throw new AdminAgendaError("invalid_request", "La sena porcentual no puede superar 100%.");
  }
  if (
    (depositType === "fixed" || depositType === undefined) &&
    priceAmount !== undefined &&
    depositValue !== undefined &&
    depositValue > priceAmount
  ) {
    throw new AdminAgendaError("invalid_request", "La sena fija no puede superar el precio.");
  }
}

function validateProfessionalInput(input: AdminProfessionalInput): void {
  if (!input.name.trim()) {
    throw new AdminAgendaError("invalid_request", "El nombre de la profesional es obligatorio.");
  }
}

function validateProfessionalPatch(input: Partial<Omit<AdminProfessionalInput, "businessSlug">>): void {
  if (input.name !== undefined && !input.name.trim()) {
    throw new AdminAgendaError("invalid_request", "El nombre de la profesional es obligatorio.");
  }
}

function validateBusinessHour(hour: AdminBusinessHourInput): void {
  if (hour.dayOfWeek < 0 || hour.dayOfWeek > 6) {
    throw new AdminAgendaError("invalid_request", "El dia debe estar entre 0 y 6.");
  }
  if (hour.startTime >= hour.endTime) {
    throw new AdminAgendaError("invalid_request", "El horario debe terminar despues de comenzar.");
  }
}

function validateBrandingInput(input: AdminBrandingInput): void {
  if (!/^#[0-9A-Fa-f]{6}$/.test(input.primaryColor)) {
    throw new AdminAgendaError("invalid_request", "El color principal debe estar en formato #RRGGBB.");
  }
  if (!isBrandingThemePreset(input.themePreset)) {
    throw new AdminAgendaError("invalid_request", "El tema visual no es valido.");
  }
  const heroText = input.heroText.trim();
  if (heroText.length < 10 || heroText.length > 180) {
    throw new AdminAgendaError("invalid_request", "El texto de portada debe tener entre 10 y 180 caracteres.");
  }
  const logoUrl = normalizeLogoUrl(input.logoUrl);
  if (logoUrl) {
    try {
      const parsed = new URL(logoUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error("Invalid protocol");
      }
    } catch {
      throw new AdminAgendaError("invalid_request", "La URL del logo debe ser una URL publica valida.");
    }
  }
}

function normalizeLogoUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
