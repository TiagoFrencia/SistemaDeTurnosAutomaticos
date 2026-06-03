import { z } from "zod";
import { addMinutes } from "@/lib/datetime";

type DepositType = "fixed" | "percentage";

const manualAppointmentSchema = z.object({
  businessSlug: z.string().min(1),
  serviceId: z.string().min(1).optional(),
  serviceIds: z.array(z.string().min(1)).min(1).optional(),
  professionalId: z.string().min(1),
  startAt: z.string().datetime({ offset: true }),
  depositMode: z.enum(["none", "cash"]).default("none"),
  customer: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(8),
    email: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value : null))
      .pipe(z.string().email().nullable())
  }),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
});

export type ManualAppointmentRepository = {
  findBusinessBySlug(slug: string): Promise<{ id: string; slug: string } | null>;
  findActiveService(input: { businessId: string; serviceId: string }): Promise<{
    id: string;
    businessId: string;
    durationMinutes: number;
    priceAmount: number;
    depositType: DepositType;
    depositValue: number;
    active: boolean;
  } | null>;
  findActiveProfessional(input: { businessId: string; professionalId: string }): Promise<{
    id: string;
    businessId: string;
    active: boolean;
  } | null>;
  upsertCustomer(input: {
    businessId: string;
    fullName: string;
    phone: string;
    email: string | null;
  }): Promise<{ id: string }>;
  createAppointment(input: {
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
  }): Promise<ManualAppointment>;
  createCashPayment(input: {
    businessId: string;
    appointmentId: string;
    provider: "cash";
    status: "approved";
    amount: number;
    currency: "ARS";
  }): Promise<void>;
  recordAppointmentServices?(input: {
    appointmentId: string;
    services: Array<{
      serviceId: string;
      position: number;
      priceAmount: number;
      depositAmount: number;
      durationMinutes: number;
    }>;
  }): Promise<void>;
};

export type ManualAppointment = {
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
};

export class ManualAppointmentError extends Error {
  constructor(
    readonly code: "invalid_request" | "not_found" | "slot_unavailable",
    message: string
  ) {
    super(message);
  }
}

export async function handleManualAppointmentRequest(input: {
  request: Request;
  repository: ManualAppointmentRepository;
  adminApiKey?: string;
  authorized?: boolean;
}): Promise<Response> {
  if (!input.authorized && !isAuthorizedAdminRequest(input.request, input.adminApiKey)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const body = await input.request.json().catch(() => null);

  try {
    const appointment = await createManualAppointment(input.repository, body);
    return json({ appointment }, 201);
  } catch (error) {
    if (error instanceof ManualAppointmentError) {
      const status = error.code === "not_found" ? 404 : error.code === "slot_unavailable" ? 409 : 400;
      return json({ error: error.message }, status);
    }

    throw error;
  }
}

export async function createManualAppointment(
  repository: ManualAppointmentRepository,
  rawInput: unknown
): Promise<ManualAppointment> {
  const parsed = manualAppointmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ManualAppointmentError("invalid_request", "Datos de turno invalidos");
  }
  const input = parsed.data;
  const serviceIds = normalizeServiceIds(input);
  if (serviceIds.length === 0) {
    throw new ManualAppointmentError("invalid_request", "Elegí al menos un servicio");
  }

  const business = await repository.findBusinessBySlug(input.businessSlug);
  if (!business) {
    throw new ManualAppointmentError("not_found", "Business not found");
  }

  const [services, professional] = await Promise.all([
    Promise.all(serviceIds.map((serviceId) => repository.findActiveService({ businessId: business.id, serviceId }))),
    repository.findActiveProfessional({ businessId: business.id, professionalId: input.professionalId })
  ]);

  if (services.some((service) => !service?.active)) {
    throw new ManualAppointmentError("not_found", "Service not found");
  }
  const activeServices = services.filter((service): service is NonNullable<typeof service> => Boolean(service));

  if (!professional || !professional.active) {
    throw new ManualAppointmentError("not_found", "Professional not found");
  }

  const customer = await repository.upsertCustomer({
    businessId: business.id,
    fullName: input.customer.fullName,
    phone: input.customer.phone,
    email: input.customer.email
  });

  const serviceSnapshots = activeServices.map((service, index) => ({
    serviceId: service.id,
    position: index + 1,
    priceAmount: service.priceAmount,
    depositAmount: depositAmountFor(service),
    durationMinutes: service.durationMinutes
  }));
  const totalAmount = serviceSnapshots.reduce((sum, service) => sum + service.priceAmount, 0);
  const totalDurationMinutes = serviceSnapshots.reduce((sum, service) => sum + service.durationMinutes, 0);
  const serviceDepositAmount = serviceSnapshots.reduce((sum, service) => sum + service.depositAmount, 0);
  const depositAmount = input.depositMode === "cash" ? serviceDepositAmount : 0;
  const appointmentInput = {
    businessId: business.id,
    professionalId: professional.id,
    serviceId: activeServices[0].id,
    customerId: customer.id,
    startAt: input.startAt,
    endAt: addMinutes(input.startAt, totalDurationMinutes),
    status: "confirmed" as const,
    source: "manual" as const,
    depositRequired: input.depositMode === "cash",
    totalAmount,
    depositAmount,
    remainingAmount: Math.max(0, totalAmount - depositAmount),
    notes: input.notes
  };

  let appointment: ManualAppointment;
  try {
    appointment = await repository.createAppointment(appointmentInput);
  } catch (error) {
    if (isExclusionViolation(error)) {
      throw new ManualAppointmentError("slot_unavailable", "El horario ya no esta disponible");
    }
    throw error;
  }

  if (input.depositMode === "cash") {
    await repository.createCashPayment({
      businessId: business.id,
      appointmentId: appointment.id,
      provider: "cash",
      status: "approved",
      amount: depositAmount,
      currency: "ARS"
    });
  }

  await repository.recordAppointmentServices?.({
    appointmentId: appointment.id,
    services: serviceSnapshots
  });

  return appointment;
}

function normalizeServiceIds(input: { serviceId?: string; serviceIds?: string[] }): string[] {
  const ids = input.serviceIds?.length ? input.serviceIds : input.serviceId ? [input.serviceId] : [];
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
}

export function isAuthorizedAdminRequest(request: Request, adminApiKey?: string): boolean {
  if (!adminApiKey) {
    return false;
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ") && auth.slice(7) === adminApiKey) {
    return true;
  }

  return readCookie(request.headers.get("cookie") ?? "", "admin_api_key") === adminApiKey;
}

function depositAmountFor(service: { priceAmount: number; depositType: DepositType; depositValue: number }) {
  return service.depositType === "percentage"
    ? Math.round((service.priceAmount * service.depositValue) / 100)
    : service.depositValue;
}

function isExclusionViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23P01";
}

function readCookie(cookieHeader: string, name: string): string | null {
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const match = parts.find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
