import { getAvailableSlots } from "@/lib/availability/availability-service";
import type { BrandingThemePreset } from "@/lib/branding/theme";
import type { AppointmentRange, TimeRange } from "@/lib/domain/types";

export type PublicBusiness = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  active: boolean;
  branding: PublicBusinessBranding;
};

export type PublicBusinessBranding = {
  primaryColor: string;
  themePreset: BrandingThemePreset;
  heroText: string;
  visualMode: "default" | "compact";
  logoUrl: string | null;
};

export type PublicService = {
  id: string;
  name: string;
  durationMinutes: number;
  priceAmount: number;
  depositAmount: number;
  active: boolean;
};

export type PublicProfessional = {
  id: string;
  name: string;
  active: boolean;
};

export type PublicBusinessHour = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type PublicAvailabilityData = {
  business: PublicBusiness | null;
  services: PublicService[];
  professionals: PublicProfessional[];
  businessHours: PublicBusinessHour[];
  appointments: AppointmentRange[];
  blocks: Array<TimeRange & { professionalId?: string | null }>;
};

export type PublicAvailabilityRepository = {
  load(input: { businessSlug: string; from: string; to: string }): Promise<PublicAvailabilityData>;
};

export type PublicAvailabilityRequest = {
  businessSlug: string;
  serviceId?: string;
  serviceIds?: string[];
  professionalId?: string;
  from: string;
  to: string;
};

export type PublicAvailabilityResponse = {
  business: {
    id: string;
    name: string;
    slug: string;
    address: string | null;
    branding: PublicBusinessBranding;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    priceAmount: number;
    depositAmount: number;
  };
  services: Array<{
    id: string;
    name: string;
    durationMinutes: number;
    priceAmount: number;
    depositAmount: number;
  }>;
  selectedServices: Array<{
    id: string;
    name: string;
    durationMinutes: number;
    priceAmount: number;
    depositAmount: number;
  }>;
  selectedServiceId: string;
  selectedServiceIds: string[];
  professionals: Array<{ id: string; name: string }>;
  selectedProfessionalId: string;
  slots: TimeRange[];
};

export class PublicAvailabilityError extends Error {
  constructor(
    readonly code: "not_found" | "invalid_request",
    message: string
  ) {
    super(message);
    this.name = "PublicAvailabilityError";
  }
}

export async function buildPublicAvailabilityResponse(
  repository: PublicAvailabilityRepository,
  request: PublicAvailabilityRequest
): Promise<PublicAvailabilityResponse> {
  const data = await repository.load({
    businessSlug: request.businessSlug,
    from: request.from,
    to: request.to
  });

  if (!data.business?.active) {
    throw new PublicAvailabilityError("not_found", "Business was not found");
  }

  const activeServices = data.services.filter((service) => service.active);
  const selectedServices = selectServices(activeServices, request);

  if (selectedServices.length === 0) {
    throw new PublicAvailabilityError("not_found", "No active service was found");
  }
  const service = summarizeServices(selectedServices);

  const activeProfessionals = data.professionals.filter((professional) => professional.active);
  const selectedProfessional =
    activeProfessionals.find((candidate) => candidate.id === request.professionalId) ??
    activeProfessionals[0];

  if (!selectedProfessional) {
    throw new PublicAvailabilityError("not_found", "No active professional was found");
  }

  const slots = getAvailableSlots({
    serviceDurationMinutes: service.durationMinutes,
    windowStart: request.from,
    windowEnd: request.to,
    businessHours: data.businessHours,
    appointments: data.appointments,
    blocks: data.blocks,
    professionalId: selectedProfessional.id
  });

  return {
    business: {
      id: data.business.id,
      name: data.business.name,
      slug: data.business.slug,
      address: data.business.address,
      branding: data.business.branding
    },
    service: {
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      priceAmount: service.priceAmount,
      depositAmount: service.depositAmount
    },
    services: activeServices.map((activeService) => ({
      id: activeService.id,
      name: activeService.name,
      durationMinutes: activeService.durationMinutes,
      priceAmount: activeService.priceAmount,
      depositAmount: activeService.depositAmount
    })),
    selectedServices: selectedServices.map((selectedService) => ({
      id: selectedService.id,
      name: selectedService.name,
      durationMinutes: selectedService.durationMinutes,
      priceAmount: selectedService.priceAmount,
      depositAmount: selectedService.depositAmount
    })),
    selectedServiceId: service.id,
    selectedServiceIds: selectedServices.map((selectedService) => selectedService.id),
    professionals: activeProfessionals.map((professional) => ({
      id: professional.id,
      name: professional.name
    })),
    selectedProfessionalId: selectedProfessional.id,
    slots
  };
}

function selectServices(
  activeServices: PublicService[],
  request: Pick<PublicAvailabilityRequest, "serviceId" | "serviceIds">
): PublicService[] {
  const requestedIds = uniqueNonEmpty(request.serviceIds?.length ? request.serviceIds : request.serviceId ? [request.serviceId] : []);
  if (requestedIds.length === 0) {
    return activeServices[0] ? [activeServices[0]] : [];
  }

  const servicesById = new Map(activeServices.map((service) => [service.id, service]));
  const selected = requestedIds.map((id) => servicesById.get(id)).filter((service): service is PublicService => Boolean(service));
  return selected.length > 0 ? selected : activeServices[0] ? [activeServices[0]] : [];
}

function summarizeServices(services: PublicService[]) {
  if (services.length === 1) {
    return services[0];
  }

  return {
    id: services[0].id,
    name: `${services.length} servicios`,
    durationMinutes: sum(services, "durationMinutes"),
    priceAmount: sum(services, "priceAmount"),
    depositAmount: sum(services, "depositAmount"),
    active: true
  };
}

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function sum(services: PublicService[], key: "durationMinutes" | "priceAmount" | "depositAmount"): number {
  return services.reduce((total, service) => total + service[key], 0);
}
