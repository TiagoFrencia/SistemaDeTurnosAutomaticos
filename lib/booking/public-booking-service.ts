import { addMinutes } from "@/lib/datetime";
import type { PaymentService } from "@/lib/payments/payment-service";

export type BookingCustomerInput = {
  fullName: string;
  phone: string;
  email: string;
};

export type PublicBookingInput = {
  businessSlug: string;
  serviceId?: string;
  serviceIds?: string[];
  professionalId: string;
  startAt: string;
  customer: BookingCustomerInput;
};

export type BookingBusinessContext = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  mercadoPagoCredentialKey: string | null;
};

export type BookingServiceContext = {
  id: string;
  name: string;
  durationMinutes: number;
  priceAmount: number;
  depositAmount: number;
  active: boolean;
};

export type BookingProfessionalContext = {
  id: string;
  active: boolean;
};

export type BookingContext = {
  business: BookingBusinessContext;
  services: BookingServiceContext[];
  professional: BookingProfessionalContext;
};

export type CreatedBookingHold = {
  appointmentId: string;
  startAt: string;
  endAt: string;
  status: "pending_payment";
};

export type PublicBookingResult = CreatedBookingHold & {
  providerPreferenceId: string;
  checkoutUrl: string;
};

export type PublicBookingRepository = {
  loadContext(input: {
    businessSlug: string;
    serviceIds: string[];
    professionalId: string;
  }): Promise<BookingContext | null>;
  upsertCustomer(input: {
    businessId: string;
    customer: BookingCustomerInput;
  }): Promise<{ id: string }>;
  createPendingHold(input: {
    businessId: string;
    professionalId: string;
    serviceId: string;
    services: Array<{
      serviceId: string;
      position: number;
      priceAmount: number;
      depositAmount: number;
      durationMinutes: number;
    }>;
    customerId: string;
    startAt: string;
    endAt: string;
    totalAmount: number;
    depositAmount: number;
  }): Promise<CreatedBookingHold>;
  recordPendingPayment(input: {
    businessId: string;
    appointmentId: string;
    providerPreferenceId: string;
    amount: number;
  }): Promise<void>;
};

export class PublicBookingError extends Error {
  constructor(
    readonly code: "not_found" | "invalid_request" | "conflict" | "payment_configuration" | "payment_provider",
    message: string
  ) {
    super(message);
    this.name = "PublicBookingError";
  }
}

export async function createPublicBooking(
  repository: PublicBookingRepository,
  paymentService: PaymentService,
  input: PublicBookingInput
): Promise<PublicBookingResult> {
  const serviceIds = normalizeServiceIds(input);
  if (serviceIds.length === 0) {
    throw new PublicBookingError("invalid_request", "Elegí al menos un servicio para reservar.");
  }

  const context = await repository.loadContext({
    businessSlug: input.businessSlug,
    serviceIds,
    professionalId: input.professionalId
  });

  if (
    !context?.business.active ||
    !context.professional.active ||
    context.services.length !== serviceIds.length ||
    context.services.some((service) => !service.active)
  ) {
    throw new PublicBookingError("not_found", "No se encontro una agenda activa para reservar.");
  }

  const credentialKey = context.business.mercadoPagoCredentialKey;
  if (!credentialKey) {
    throw new PublicBookingError(
      "payment_configuration",
      "Faltan credenciales de Mercado Pago para este negocio."
    );
  }

  const totalDurationMinutes = sumServices(context.services, "durationMinutes");
  const totalAmount = sumServices(context.services, "priceAmount");
  const depositAmount = sumServices(context.services, "depositAmount");
  const endAt = addMinutes(input.startAt, totalDurationMinutes);
  const customer = await repository.upsertCustomer({
    businessId: context.business.id,
    customer: input.customer
  });
  const hold = await repository.createPendingHold({
    businessId: context.business.id,
    professionalId: input.professionalId,
    serviceId: context.services[0].id,
    services: context.services.map((service, index) => ({
      serviceId: service.id,
      position: index + 1,
      priceAmount: service.priceAmount,
      depositAmount: service.depositAmount,
      durationMinutes: service.durationMinutes
    })),
    customerId: customer.id,
    startAt: input.startAt,
    endAt,
    totalAmount,
    depositAmount
  });
  const checkout = await paymentService.createCheckoutPreference({
    businessId: context.business.id,
    appointmentId: hold.appointmentId,
    credentialKey,
    serviceName: checkoutServiceName(context.services),
    depositAmount,
    customerEmail: input.customer.email,
    webhookUrl: buildWebhookUrl(),
    successUrl: buildPublicUrl(`/${context.business.slug}?payment=success`),
    failureUrl: buildPublicUrl(`/${context.business.slug}?payment=failure`)
  });

  await repository.recordPendingPayment({
    businessId: context.business.id,
    appointmentId: hold.appointmentId,
    providerPreferenceId: checkout.providerPreferenceId,
    amount: depositAmount
  });

  return {
    ...hold,
    providerPreferenceId: checkout.providerPreferenceId,
    checkoutUrl: checkout.checkoutUrl
  };
}

function normalizeServiceIds(input: Pick<PublicBookingInput, "serviceId" | "serviceIds">): string[] {
  const ids = input.serviceIds?.length ? input.serviceIds : input.serviceId ? [input.serviceId] : [];
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
}

function sumServices(services: BookingServiceContext[], key: "durationMinutes" | "priceAmount" | "depositAmount") {
  return services.reduce((total, service) => total + service[key], 0);
}

function checkoutServiceName(services: BookingServiceContext[]): string {
  if (services.length === 1) {
    return services[0].name;
  }

  return `${services[0].name} + ${services.length - 1} servicio${services.length > 2 ? "s" : ""}`;
}

function buildWebhookUrl(): string {
  return buildPublicUrl("/api/mercado-pago/webhook", process.env.NGROK_PUBLIC_URL);
}

function buildPublicUrl(path: string, preferredBase = process.env.NEXT_PUBLIC_APP_URL): string {
  const base = preferredBase || "http://localhost:3000";
  return new URL(path, base).toString();
}
