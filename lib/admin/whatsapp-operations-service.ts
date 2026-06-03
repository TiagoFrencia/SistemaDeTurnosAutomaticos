import { isAuthorizedAdminRequest } from "@/lib/admin/manual-appointment-service";

export type AdminWhatsAppConversationState =
  | "greeting"
  | "selecting_services"
  | "selecting_professional"
  | "selecting_day"
  | "selecting_slot"
  | "collecting_name"
  | "collecting_email"
  | "confirming_booking"
  | "completed";

export type AdminWhatsAppConversationContext = {
  serviceIds?: string[];
  professionalId?: string;
  selectedDate?: string;
  startAt?: string;
  fullName?: string;
  email?: string;
  dayPage?: number;
  slotPage?: number;
};

export type AdminWhatsAppConversation = {
  id: string;
  businessId: string;
  phone: string;
  state: AdminWhatsAppConversationState;
  stateLabel: string;
  suggestedAction: string;
  context: AdminWhatsAppConversationContext;
  displayContext: AdminWhatsAppDisplayContext;
  lastMessage: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  processedMessagesCount: number;
  isExpired: boolean;
};

export type AdminWhatsAppDisplayContext = {
  serviceNames: string[];
  professionalName?: string;
  selectedDayLabel?: string;
  selectedTimeLabel?: string;
  fullName?: string;
  email?: string;
};

export type AdminWhatsAppRepository = {
  findBusinessBySlug(slug: string): Promise<{ id: string; slug: string } | null>;
  listConversations(input: {
    businessId: string;
    phone?: string;
    state?: AdminWhatsAppConversationState;
    limit: number;
  }): Promise<Array<Omit<AdminWhatsAppConversation, "stateLabel" | "suggestedAction" | "displayContext" | "processedMessagesCount" | "isExpired">>>;
  countProcessedMessages(input: { businessId: string; phones: string[] }): Promise<Record<string, number>>;
  findServiceNames(input: { businessId: string; serviceIds: string[] }): Promise<Record<string, string>>;
  findProfessionalNames(input: { businessId: string; professionalIds: string[] }): Promise<Record<string, string>>;
  resetConversation(input: {
    businessId: string;
    phone: string;
    expiresAt: string;
  }): Promise<"updated" | "not_found">;
};

export class AdminWhatsAppError extends Error {
  constructor(
    readonly code: "invalid_request" | "not_found",
    message: string
  ) {
    super(message);
  }
}

export async function listAdminWhatsAppConversations(input: {
  repository: AdminWhatsAppRepository;
  businessSlug: string;
  phone?: string;
  state?: string;
  limit?: number;
  now?: Date;
}): Promise<AdminWhatsAppConversation[]> {
  const business = await input.repository.findBusinessBySlug(input.businessSlug);
  if (!business) {
    throw new AdminWhatsAppError("not_found", "Business not found");
  }

  const state = parseConversationState(input.state);
  const phone = input.phone ? normalizePhone(input.phone) : undefined;
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 100);
  const conversations = await input.repository.listConversations({
    businessId: business.id,
    phone,
    state,
    limit
  });
  const [counts, serviceNames, professionalNames] = await Promise.all([
    input.repository.countProcessedMessages({
      businessId: business.id,
      phones: conversations.map((conversation) => conversation.phone)
    }),
    input.repository.findServiceNames({
      businessId: business.id,
      serviceIds: unique(conversations.flatMap((conversation) => conversation.context.serviceIds ?? []))
    }),
    input.repository.findProfessionalNames({
      businessId: business.id,
      professionalIds: unique(conversations.map((conversation) => conversation.context.professionalId).filter(isString))
    })
  ]);
  const nowMs = (input.now ?? new Date()).getTime();

  return conversations.map((conversation) => ({
    ...conversation,
    stateLabel: stateLabel(conversation.state),
    suggestedAction: suggestedAction(conversation.state, new Date(conversation.expiresAt).getTime() <= nowMs),
    displayContext: buildDisplayContext(conversation.context, serviceNames, professionalNames),
    processedMessagesCount: counts[conversation.phone] ?? 0,
    isExpired: new Date(conversation.expiresAt).getTime() <= nowMs
  }));
}

export async function resetAdminWhatsAppConversation(input: {
  repository: AdminWhatsAppRepository;
  businessSlug: string;
  phone: unknown;
  now?: Date;
}): Promise<{ phone: string; state: "greeting" }> {
  if (typeof input.phone !== "string" || input.phone.trim().length < 8) {
    throw new AdminWhatsAppError("invalid_request", "Telefono invalido");
  }

  const phone = normalizePhone(input.phone);
  const business = await input.repository.findBusinessBySlug(input.businessSlug);
  if (!business) {
    throw new AdminWhatsAppError("not_found", "Business not found");
  }

  const expiresAt = new Date((input.now ?? new Date()).getTime() + 12 * 60 * 60 * 1000).toISOString();
  const result = await input.repository.resetConversation({
    businessId: business.id,
    phone,
    expiresAt
  });

  if (result === "not_found") {
    throw new AdminWhatsAppError("not_found", "Conversacion no encontrada");
  }

  return { phone, state: "greeting" };
}

export async function handleAdminWhatsAppResetRequest(input: {
  request: Request;
  repository: AdminWhatsAppRepository;
  adminApiKey?: string;
  businessSlug: string;
  authorized?: boolean;
}): Promise<Response> {
  if (!input.authorized && !isAuthorizedAdminRequest(input.request, input.adminApiKey)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const body = await input.request.json().catch(() => null);

  try {
    const result = await resetAdminWhatsAppConversation({
      repository: input.repository,
      businessSlug: input.businessSlug,
      phone: isRecord(body) ? body.phone : undefined
    });
    return json(result, 200);
  } catch (error) {
    if (error instanceof AdminWhatsAppError) {
      return json(
        { error: error.message },
        error.code === "not_found" ? 404 : 400
      );
    }

    throw error;
  }
}

export function normalizePhone(value: string): string {
  const digits = value.trim().replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export function parseConversationState(value?: string): AdminWhatsAppConversationState | undefined {
  return isConversationState(value) ? value : undefined;
}

export function stateLabel(state: AdminWhatsAppConversationState): string {
  const labels: Record<AdminWhatsAppConversationState, string> = {
    greeting: "Inicio",
    selecting_services: "Eligiendo servicio",
    selecting_professional: "Eligiendo profesional",
    selecting_day: "Eligiendo dia",
    selecting_slot: "Eligiendo horario",
    collecting_name: "Pidiendo nombre",
    collecting_email: "Pidiendo email",
    confirming_booking: "Confirmando resumen",
    completed: "Completado"
  };

  return labels[state];
}

function buildDisplayContext(
  context: AdminWhatsAppConversationContext,
  serviceNames: Record<string, string>,
  professionalNames: Record<string, string>
): AdminWhatsAppDisplayContext {
  const serviceIds = context.serviceIds ?? [];
  return {
    serviceNames: serviceIds.map((serviceId) => serviceNames[serviceId] ?? `Servicio no encontrado (${shortId(serviceId)})`),
    professionalName: context.professionalId
      ? professionalNames[context.professionalId] ?? `Profesional no encontrado (${shortId(context.professionalId)})`
      : undefined,
    selectedDayLabel: context.selectedDate ? formatSelectedDay(context.selectedDate) : undefined,
    selectedTimeLabel: context.startAt ? formatSelectedTime(context.startAt) : undefined,
    fullName: context.fullName,
    email: context.email
  };
}

function suggestedAction(state: AdminWhatsAppConversationState, isExpired: boolean): string {
  if (isExpired) {
    return "Conversacion vencida: conviene reiniciar o pedir que escriba hola.";
  }

  const actions: Record<AdminWhatsAppConversationState, string> = {
    greeting: "Chat reiniciado, puede escribir hola.",
    selecting_services: "Esperando seleccion de servicio de la clienta.",
    selecting_professional: "Esperando seleccion de profesional de la clienta.",
    selecting_day: "Esperando seleccion de dia de la clienta.",
    selecting_slot: "Esperando seleccion de horario de la clienta.",
    collecting_name: "Esperando nombre completo de la clienta.",
    collecting_email: "Esperando email de la clienta.",
    confirming_booking: "Esperando que confirme y pague.",
    completed: "Reserva enviada al pago."
  };

  return actions[state];
}

function formatSelectedDay(value: string): string {
  const date = new Date(`${value}T12:00:00-03:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(date);
}

function formatSelectedTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(date);
}

function shortId(value: string): string {
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isConversationState(value: unknown): value is AdminWhatsAppConversationState {
  return (
    typeof value === "string" &&
    [
      "greeting",
      "selecting_services",
      "selecting_professional",
      "selecting_day",
      "selecting_slot",
      "collecting_name",
      "collecting_email",
      "confirming_booking",
      "completed"
    ].includes(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
