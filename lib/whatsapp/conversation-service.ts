import { buildPublicAvailabilityWindow } from "@/lib/public/availability-window";
import type { PublicAvailabilityResponse } from "@/lib/public/public-availability-service";
import {
  PublicBookingError,
  type PublicBookingInput,
  type PublicBookingResult
} from "@/lib/booking/public-booking-service";
import { textWhatsAppMessage, type WhatsAppOutboundMessage } from "@/lib/notifications/whatsapp-adapter";

export type WhatsAppConversationState =
  | "greeting"
  | "selecting_services"
  | "selecting_professional"
  | "selecting_day"
  | "selecting_slot"
  | "collecting_name"
  | "collecting_email"
  | "confirming_booking"
  | "completed";

export type WhatsAppConversationContext = {
  serviceIds?: string[];
  professionalId?: string;
  selectedDate?: string;
  startAt?: string;
  fullName?: string;
  email?: string;
  dayPage?: number;
  slotPage?: number;
};

export type WhatsAppConversation = {
  businessId: string;
  phone: string;
  state: WhatsAppConversationState;
  context: WhatsAppConversationContext;
  expiresAt: string;
};

export type WhatsAppBusiness = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

export type WhatsAppConversationRepository = {
  loadBusinessBySlug(slug: string): Promise<WhatsAppBusiness | null>;
  loadConversation(input: { businessId: string; phone: string }): Promise<WhatsAppConversation | null>;
  saveConversation(conversation: WhatsAppConversation & { lastMessage?: string }): Promise<void>;
};

export type WhatsAppBookingFlowDependencies = {
  repository: WhatsAppConversationRepository;
  loadAvailability(input: {
    businessSlug: string;
    serviceIds?: string[];
    professionalId?: string;
  }): Promise<PublicAvailabilityResponse>;
  createBooking(input: PublicBookingInput): Promise<PublicBookingResult>;
  now?: () => Date;
};

export type WhatsAppInboundMessage = {
  businessSlug: string;
  from: string;
  text: string;
};

export type WhatsAppFlowResult = {
  businessId: string;
  to: string;
  reply: string;
  message: WhatsAppOutboundMessage;
  conversation: WhatsAppConversation & { lastMessage?: string };
};

const CONVERSATION_TTL_HOURS = 12;

export async function handleWhatsAppBookingMessage(
  dependencies: WhatsAppBookingFlowDependencies,
  message: WhatsAppInboundMessage
): Promise<WhatsAppFlowResult> {
  const business = await dependencies.repository.loadBusinessBySlug(message.businessSlug);
  if (!business?.active) {
    const fallbackBusinessId = business?.id ?? "00000000-0000-0000-0000-000000000000";
    const messageReply = textWhatsAppMessage("No encontramos una agenda activa para reservar por WhatsApp.");
    return {
      businessId: business?.id ?? "",
      to: message.from,
      reply: fallbackText(messageReply),
      message: messageReply,
      conversation: freshConversation(fallbackBusinessId, message.from, dependencies)
    };
  }

  const normalizedText = normalizeText(message.text);
  const existing = await dependencies.repository.loadConversation({
    businessId: business.id,
    phone: message.from
  });
  const expired = existing ? new Date(existing.expiresAt).getTime() <= currentDate(dependencies).getTime() : true;
  const conversation =
    !existing || expired || shouldRestart(normalizedText)
      ? freshConversation(business.id, message.from, dependencies)
      : existing;

  const availability = await dependencies.loadAvailability({
    businessSlug: business.slug,
    serviceIds: conversation.context.serviceIds,
    professionalId: conversation.context.professionalId
  });

  const next = await advanceConversation(dependencies, business, availability, conversation, normalizedText);

  return {
    businessId: business.id,
    to: message.from,
    reply: fallbackText(next.message),
    message: next.message,
    conversation: {
      ...next.conversation,
      lastMessage: message.text
    }
  };
}

async function advanceConversation(
  dependencies: WhatsAppBookingFlowDependencies,
  business: WhatsAppBusiness,
  availability: PublicAvailabilityResponse,
  conversation: WhatsAppConversation,
  text: string
): Promise<{ conversation: WhatsAppConversation; message: WhatsAppOutboundMessage }> {
  if (isHelp(text)) {
    return { conversation, message: helpPrompt(conversation.state, availability, conversation.context) };
  }

  if (isCancel(text)) {
    return {
      conversation: updateConversation(conversation, "selecting_services", {}),
      message: servicesPrompt(business.name, availability, "Listo, cancelé esta reserva.")
    };
  }

  if (isBack(text)) {
    return goBack(conversation, availability, business.name);
  }

  if (conversation.state === "greeting" || conversation.state === "selecting_services") {
    if (conversation.state === "greeting" || isGreeting(text)) {
      return {
        conversation: updateConversation(conversation, "selecting_services", {}),
        message: servicesPrompt(business.name, availability)
      };
    }

    if (text === "add_service") {
      return {
        conversation,
        message: servicesPrompt(business.name, availability, "Elegí otro servicio para sumar a la reserva.")
      };
    }

    if (text === "continue_services") {
      if (!conversation.context.serviceIds?.length) {
        return {
          conversation,
          message: servicesPrompt(business.name, availability, "Primero elegí al menos un servicio.")
        };
      }

      if (availability.professionals.length === 1) {
        const professional = availability.professionals[0];
        const selectedAvailability = await dependencies.loadAvailability({
          businessSlug: business.slug,
          serviceIds: conversation.context.serviceIds,
          professionalId: professional.id
        });
        return {
          conversation: updateConversation(conversation, "selecting_day", {
            ...conversation.context,
            professionalId: professional.id,
            dayPage: 0,
            slotPage: 0
          }),
          message: daysPrompt(selectedAvailability)
        };
      }

      return {
        conversation: updateConversation(conversation, "selecting_professional", conversation.context),
        message: professionalsPrompt(availability)
      };
    }

    const serviceFromInteractive = parseEntityId(text, "service");
    const serviceIds = serviceFromInteractive
      ? appendUnique(conversation.context.serviceIds, serviceFromInteractive)
      : parseNumberChoices(text, availability.services).map((service) => service.id);
    if (serviceIds.length === 0) {
      return {
        conversation,
        message: invalidWithPrompt("No pude identificar el servicio. Respondé con el número.", servicesPrompt(business.name, availability))
      };
    }

    if (serviceFromInteractive) {
      const nextContext = { ...conversation.context, serviceIds };
      return {
        conversation: updateConversation(conversation, "selecting_services", nextContext),
        message: serviceActionsPrompt(availability, nextContext)
      };
    }

    const nextContext = { ...conversation.context, serviceIds, dayPage: 0, slotPage: 0 };
    return {
      conversation: updateConversation(conversation, "selecting_professional", nextContext),
      message: professionalsPrompt(availability)
    };
  }

  if (conversation.state === "selecting_professional") {
    const professionalId = parseEntityId(text, "professional");
    const professional = professionalId
      ? availability.professionals.find((candidate) => candidate.id === professionalId) ?? null
      : parseNumberChoice(text, availability.professionals);
    if (!professional) {
      return {
        conversation,
        message: invalidWithPrompt("No pude identificar la profesional. Respondé con el número.", professionalsPrompt(availability))
      };
    }

    const selectedAvailability = await dependencies.loadAvailability({
      businessSlug: business.slug,
      serviceIds: conversation.context.serviceIds,
      professionalId: professional.id
    });
    const nextContext = { ...conversation.context, professionalId: professional.id };
    return {
      conversation: updateConversation(conversation, "selecting_day", nextContext),
      message: daysPrompt(selectedAvailability, nextContext)
    };
  }

  if (conversation.state === "selecting_day") {
    if (text === "days_next") {
      const nextContext = { ...conversation.context, dayPage: (conversation.context.dayPage ?? 0) + 1 };
      return {
        conversation: updateConversation(conversation, "selecting_day", nextContext),
        message: daysPrompt(availability, nextContext)
      };
    }

    const days = availableDays(availability);
    const selectedDate = parseEntityId(text, "day");
    const selectedDay = selectedDate
      ? days.find((day) => day.id === selectedDate) ?? null
      : parseNumberChoice(text, pagedItems(days, conversation.context.dayPage));
    if (!selectedDay) {
      return {
        conversation,
        message: invalidWithPrompt("No pude identificar el día. Respondé con el número.", daysPrompt(availability, conversation.context))
      };
    }

    const nextContext = { ...conversation.context, selectedDate: selectedDay.id, slotPage: 0 };
    return {
      conversation: updateConversation(conversation, "selecting_slot", nextContext),
      message: slotsPrompt(availability, nextContext)
    };
  }

  if (conversation.state === "selecting_slot") {
    if (text === "slots_next") {
      const nextContext = { ...conversation.context, slotPage: (conversation.context.slotPage ?? 0) + 1 };
      return {
        conversation: updateConversation(conversation, "selecting_slot", nextContext),
        message: slotsPrompt(availability, nextContext)
      };
    }

    const slots = slotsForDate(availability, conversation.context.selectedDate);
    const selectedSlotId = parseEntityId(text, "slot");
    const selectedSlot = selectedSlotId
      ? slots.find((slot) => slot.startAt === selectedSlotId) ?? null
      : parseNumberChoice(text, pagedItems(slots, conversation.context.slotPage));
    if (!selectedSlot) {
      return {
        conversation,
        message: invalidWithPrompt("No pude identificar el horario. Respondé con el número.", slotsPrompt(availability, conversation.context))
      };
    }

    const nextContext = { ...conversation.context, startAt: selectedSlot.startAt };
    return {
      conversation: updateConversation(conversation, "collecting_name", nextContext),
      message: textWhatsAppMessage("Perfecto. Decime tu nombre completo para preparar la reserva.")
    };
  }

  if (conversation.state === "collecting_name") {
    if (text.length < 2) {
      return { conversation, message: textWhatsAppMessage("Necesito tu nombre completo para preparar la reserva.") };
    }

    return {
      conversation: updateConversation(conversation, "collecting_email", {
        ...conversation.context,
        fullName: text
      }),
      message: textWhatsAppMessage("Gracias. Ahora pasame tu email para enviarte el comprobante y el link de pago.")
    };
  }

  if (conversation.state === "collecting_email") {
    if (!isEmail(text)) {
      return { conversation, message: textWhatsAppMessage("Ese email no parece válido. Mandamelo de nuevo, por ejemplo ana@email.com.") };
    }

    const context = { ...conversation.context, email: text };
    return {
      conversation: updateConversation(conversation, "confirming_booking", context),
      message: bookingSummaryPrompt(availability, context)
    };
  }

  if (conversation.state === "confirming_booking") {
    if (text === "2" || text === "change_slot") {
      return {
        conversation: updateConversation(conversation, "selecting_slot", {
          ...conversation.context,
          startAt: undefined
        }),
        message: slotsPrompt(availability, conversation.context)
      };
    }

    if (text !== "1" && text !== "confirm_booking") {
      return {
        conversation,
        message: textWhatsAppMessage("Respondé 1 para confirmar, 2 para cambiar el horario o escribí cancelar.")
      };
    }

    const context = conversation.context;
    const booking = await createBookingFromConversation(dependencies, business.slug, conversation.phone, context).catch((error) => {
      if (error instanceof PublicBookingError && error.code === "conflict") {
        return null;
      }
      throw error;
    });

    if (!booking) {
      return {
        conversation: updateConversation(conversation, "selecting_slot", {
          ...conversation.context,
          startAt: undefined
        }),
        message: invalidWithPrompt("Ese horario se ocupó recién. Elegí otro horario disponible.", slotsPrompt(availability, conversation.context))
      };
    }

    return {
      conversation: updateConversation(conversation, "completed", context),
      message: paymentPrompt(booking.checkoutUrl)
    };
  }

  return {
    conversation: updateConversation(conversation, "selecting_services", {}),
    message: servicesPrompt(business.name, availability)
  };
}

async function createBookingFromConversation(
  dependencies: WhatsAppBookingFlowDependencies,
  businessSlug: string,
  phone: string,
  context: WhatsAppConversationContext
): Promise<PublicBookingResult> {
  if (!context.serviceIds?.length || !context.professionalId || !context.startAt || !context.fullName || !context.email) {
    throw new PublicBookingError("invalid_request", "La conversación no tiene datos suficientes para crear la reserva.");
  }

  try {
    return await dependencies.createBooking({
      businessSlug,
      serviceIds: context.serviceIds,
      professionalId: context.professionalId,
      startAt: context.startAt,
      customer: {
        fullName: context.fullName,
        phone,
        email: context.email
      }
    });
  } catch (error) {
    if (error instanceof PublicBookingError && error.code === "conflict") {
      throw new PublicBookingError("conflict", "Ese horario se ocupó recién. Escribí hola para elegir otro.");
    }
    throw error;
  }
}

function servicesPrompt(
  businessName: string,
  availability: PublicAvailabilityResponse,
  prefix?: string
): WhatsAppOutboundMessage {
  const body = [prefix, `Hola, soy el asistente de turnos de ${businessName}.`, "Elegí servicio:"]
    .filter(Boolean)
    .join("\n\n");
  const rows = availability.services.slice(0, 10).map((service) => ({
    id: `service:${service.id}`,
    title: truncateForWhatsApp(service.name, 24),
    description: `${service.durationMinutes} min | Seña ${formatMoney(service.depositAmount)}`
  }));
  const fallbackOptions = availability.services
    .map((service, index) => `${index + 1}) ${service.name}\n   ${service.durationMinutes} min | Seña ${formatMoney(service.depositAmount)}`)
    .join("\n");

  return {
    kind: "list",
    body,
    buttonText: "Elegir servicio",
    sections: [{ title: "Servicios", rows }],
    fallbackText: [body, "", fallbackOptions, "", "Respondé 1 o 1,2 si querés varios."].join("\n")
  };
}

function serviceActionsPrompt(
  availability: PublicAvailabilityResponse,
  context: WhatsAppConversationContext
): WhatsAppOutboundMessage {
  const services = selectedServices(availability, context.serviceIds);
  const body = [
    "Servicio agregado:",
    services.map((service) => `- ${service.name}`).join("\n"),
    "",
    "¿Querés sumar otro servicio o continuar?"
  ].join("\n");

  return {
    kind: "buttons",
    body,
    buttons: [
      { id: "add_service", title: "Agregar otro" },
      { id: "continue_services", title: "Continuar" },
      { id: "cancel", title: "Cancelar" }
    ],
    fallbackText: [body, "", "1) Agregar otro", "2) Continuar", "3) Cancelar"].join("\n")
  };
}

function professionalsPrompt(availability: PublicAvailabilityResponse): WhatsAppOutboundMessage {
  const fallback = [
    "Elegí profesional:",
    availability.professionals.map((professional, index) => `${index + 1}) ${professional.name}`).join("\n"),
    "",
    "Respondé con el número."
  ].join("\n");

  return {
    kind: "list",
    body: "Elegí profesional:",
    buttonText: "Profesionales",
    sections: [
      {
        title: "Profesionales",
        rows: availability.professionals.slice(0, 10).map((professional) => ({
          id: `professional:${professional.id}`,
          title: truncateForWhatsApp(professional.name, 24)
        }))
      }
    ],
    fallbackText: fallback
  };
}

function daysPrompt(
  availability: PublicAvailabilityResponse,
  context: WhatsAppConversationContext = {}
): WhatsAppOutboundMessage {
  const days = availableDays(availability);
  if (days.length === 0) {
    return textWhatsAppMessage("No hay días disponibles para esa selección. Escribí volver para cambiar o cancelar para salir.");
  }

  const page = context.dayPage ?? 0;
  const visibleDays = pagedItems(days, page);
  const rows = visibleDays.map((day) => ({
    id: `day:${day.id}`,
    title: truncateForWhatsApp(day.label, 24)
  }));
  if (hasNextPage(days, page)) {
    rows.push({ id: "days_next", title: "Ver más días" });
  }
  const fallback = [
    "Elegí un día:",
    visibleDays.map((day, index) => `${index + 1}) ${day.label}`).join("\n"),
    hasNextPage(days, page) ? `${visibleDays.length + 1}) Ver más días` : null,
    "",
    "Respondé con el número. Podés escribir volver, cancelar o ayuda."
  ].filter(Boolean).join("\n");

  return {
    kind: "list",
    body: "Elegí un día:",
    buttonText: "Ver días",
    sections: [{ title: "Días disponibles", rows }],
    fallbackText: fallback
  };
}

function slotsPrompt(
  availability: PublicAvailabilityResponse,
  context: WhatsAppConversationContext = {}
): WhatsAppOutboundMessage {
  const slots = slotsForDate(availability, context.selectedDate);
  if (slots.length === 0) {
    return textWhatsAppMessage("No hay horarios disponibles ese día. Escribí volver para elegir otro día.");
  }

  const page = context.slotPage ?? 0;
  const visibleSlots = pagedItems(slots, page);
  const rows = visibleSlots.map((slot) => ({
    id: `slot:${slot.startAt}`,
    title: truncateForWhatsApp(slot.label, 24)
  }));
  if (hasNextPage(slots, page)) {
    rows.push({ id: "slots_next", title: "Ver más horarios" });
  }
  const fallback = [
    "Elegí un horario:",
    visibleSlots.map((slot, index) => `${index + 1}) ${slot.label}`).join("\n"),
    hasNextPage(slots, page) ? `${visibleSlots.length + 1}) Ver más horarios` : null,
    "",
    "Respondé con el número. Podés escribir volver, cancelar o ayuda."
  ].filter(Boolean).join("\n");

  return {
    kind: "list",
    body: "Elegí un horario:",
    buttonText: "Ver horarios",
    sections: [{ title: "Horarios", rows }],
    fallbackText: fallback
  };
}

function bookingSummaryPrompt(
  availability: PublicAvailabilityResponse,
  context: WhatsAppConversationContext
): WhatsAppOutboundMessage {
  const services = selectedServices(availability, context.serviceIds);
  const professional = availability.professionals.find((candidate) => candidate.id === context.professionalId);
  const totalDeposit = services.reduce((total, service) => total + service.depositAmount, 0);
  const date = context.startAt ? formatDay(context.startAt.slice(0, 10)) : "A confirmar";
  const time = context.startAt ? formatTime(context.startAt) : "A confirmar";

  const body = [
    "Revisá tu reserva:",
    "",
    `${services.length > 1 ? "Servicios" : "Servicio"}: ${services.map((service) => service.name).join(", ")}`,
    `Con: ${professional?.name ?? "A confirmar"}`,
    `Día: ${date}`,
    `Hora: ${time}`,
    `Nombre: ${context.fullName ?? "A confirmar"}`,
    `Email: ${context.email ?? "A confirmar"}`,
    `Seña: ${formatMoney(totalDeposit)}`,
    "",
  ].join("\n");

  return {
    kind: "buttons",
    body,
    buttons: [
      { id: "confirm_booking", title: "Confirmar y pagar" },
      { id: "change_slot", title: "Cambiar horario" },
      { id: "cancel", title: "Cancelar" }
    ],
    fallbackText: [body, "", "1) Confirmar y pagar", "2) Cambiar horario", "Cancelar: escribí cancelar"].join("\n")
  };
}

function paymentPrompt(checkoutUrl: string): WhatsAppOutboundMessage {
  const fallbackText = [
    "Listo, te guardé el horario mientras pagás la seña.",
    "No aceptamos efectivo por WhatsApp.",
    "",
    "Pagá acá:",
    checkoutUrl
  ].join("\n");

  return {
    kind: "cta_url",
    body: "Listo, te guardé el horario mientras pagás la seña.\nNo aceptamos efectivo por WhatsApp.",
    buttonText: "Pagar seña",
    url: checkoutUrl,
    fallbackText
  };
}

function helpPrompt(
  state: WhatsAppConversationState,
  availability: PublicAvailabilityResponse,
  context: WhatsAppConversationContext
): WhatsAppOutboundMessage {
  if (state === "selecting_services" || state === "greeting") {
    return servicesPrompt(availability.business.name, availability);
  }

  if (state === "selecting_professional") {
    return professionalsPrompt(availability);
  }

  if (state === "selecting_day") {
    return daysPrompt(availability, context);
  }

  if (state === "selecting_slot") {
    return slotsPrompt(availability, context);
  }

  if (state === "collecting_name") {
    return textWhatsAppMessage("Mandame tu nombre completo. También podés escribir volver o cancelar.");
  }

  if (state === "collecting_email") {
    return textWhatsAppMessage("Mandame tu email para enviarte el comprobante y link de pago. También podés escribir volver o cancelar.");
  }

  if (state === "confirming_booking") {
    return bookingSummaryPrompt(availability, context);
  }

  return textWhatsAppMessage("Escribí hola para empezar una nueva reserva.");
}

function goBack(
  conversation: WhatsAppConversation,
  availability: PublicAvailabilityResponse,
  businessName: string
): { conversation: WhatsAppConversation; message: WhatsAppOutboundMessage } {
  if (conversation.state === "selecting_professional") {
    return {
      conversation: updateConversation(conversation, "selecting_services", { ...conversation.context, serviceIds: undefined }),
      message: servicesPrompt(businessName, availability)
    };
  }

  if (conversation.state === "selecting_day") {
    return {
      conversation: updateConversation(conversation, "selecting_professional", {
        ...conversation.context,
        professionalId: undefined,
        selectedDate: undefined,
        startAt: undefined
      }),
      message: professionalsPrompt(availability)
    };
  }

  if (conversation.state === "selecting_slot") {
    return {
      conversation: updateConversation(conversation, "selecting_day", {
        ...conversation.context,
        selectedDate: undefined,
        startAt: undefined
      }),
      message: daysPrompt(availability, conversation.context)
    };
  }

  if (conversation.state === "collecting_name") {
    return {
      conversation: updateConversation(conversation, "selecting_slot", {
        ...conversation.context,
        startAt: undefined
      }),
      message: slotsPrompt(availability, conversation.context)
    };
  }

  if (conversation.state === "collecting_email") {
    return {
      conversation: updateConversation(conversation, "collecting_name", {
        ...conversation.context,
        fullName: undefined
      }),
      message: textWhatsAppMessage("Perfecto, volvamos al nombre. Decime tu nombre completo.")
    };
  }

  if (conversation.state === "confirming_booking") {
    return {
      conversation: updateConversation(conversation, "collecting_email", {
        ...conversation.context,
        email: undefined
      }),
      message: textWhatsAppMessage("Volvemos al email. Mandamelo de nuevo para preparar el comprobante.")
    };
  }

  return {
    conversation: updateConversation(conversation, "selecting_services", {}),
    message: servicesPrompt(businessName, availability)
  };
}

function invalidWithPrompt(message: string, prompt: WhatsAppOutboundMessage): WhatsAppOutboundMessage {
  return textWhatsAppMessage(`${message}\n\n${fallbackText(prompt)}`);
}

function availableDays(availability: PublicAvailabilityResponse): Array<{ id: string; label: string }> {
  const dates = Array.from(new Set(availability.slots.map((slot) => slot.startAt.slice(0, 10))));
  return dates.map((date) => ({
    id: date,
    label: formatDay(date)
  }));
}

function slotsForDate(availability: PublicAvailabilityResponse, selectedDate?: string): Array<{ id: string; startAt: string; label: string }> {
  return availability.slots
    .filter((slot) => !selectedDate || slot.startAt.startsWith(selectedDate))
    .map((slot) => ({
      id: slot.startAt,
      startAt: slot.startAt,
      label: formatTime(slot.startAt)
    }));
}

function selectedServices(
  availability: PublicAvailabilityResponse,
  serviceIds?: string[]
): Array<{ id: string; name: string; durationMinutes: number; priceAmount: number; depositAmount: number }> {
  const ids = serviceIds?.length ? serviceIds : availability.selectedServiceIds;
  const servicesById = new Map(availability.services.map((service) => [service.id, service]));
  return ids.map((id) => servicesById.get(id)).filter((service): service is NonNullable<typeof service> => Boolean(service));
}

function parseNumberChoice<T>(text: string, values: T[]): T | null {
  const value = Number.parseInt(text, 10);
  return Number.isInteger(value) && value >= 1 && value <= values.length ? values[value - 1] : null;
}

function parseNumberChoices<T>(text: string, values: T[]): T[] {
  const seen = new Set<number>();
  return text
    .split(/[,\s]+/)
    .map((part) => Number.parseInt(part, 10))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= values.length)
    .filter((value) => {
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    })
    .map((value) => values[value - 1]);
}

function parseEntityId(text: string, prefix: string): string | null {
  const marker = `${prefix}:`;
  return text.startsWith(marker) ? text.slice(marker.length) : null;
}

function appendUnique(values: string[] | undefined, value: string): string[] {
  return Array.from(new Set([...(values ?? []), value]));
}

function pagedItems<T>(values: T[], page = 0): T[] {
  const safePage = Math.max(0, page);
  return values.slice(safePage * 9, safePage * 9 + 9);
}

function hasNextPage<T>(values: T[], page = 0): boolean {
  const safePage = Math.max(0, page);
  return values.length > safePage * 9 + 9;
}

function fallbackText(message: WhatsAppOutboundMessage): string {
  if ("fallbackText" in message) {
    return message.fallbackText;
  }

  return message.body;
}

function truncateForWhatsApp(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}

function freshConversation(
  businessId: string,
  phone: string,
  dependencies: WhatsAppBookingFlowDependencies
): WhatsAppConversation {
  return {
    businessId,
    phone,
    state: "greeting",
    context: {},
    expiresAt: expiresAt(dependencies)
  };
}

function updateConversation(
  conversation: WhatsAppConversation,
  state: WhatsAppConversationState,
  context: WhatsAppConversationContext
): WhatsAppConversation {
  return {
    ...conversation,
    state,
    context: cleanContext(context)
  };
}

function cleanContext(context: WhatsAppConversationContext): WhatsAppConversationContext {
  return Object.fromEntries(Object.entries(context).filter(([, value]) => value !== undefined)) as WhatsAppConversationContext;
}

function expiresAt(dependencies: WhatsAppBookingFlowDependencies): string {
  const date = currentDate(dependencies);
  return new Date(date.getTime() + CONVERSATION_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

function currentDate(dependencies: WhatsAppBookingFlowDependencies): Date {
  return dependencies.now?.() ?? new Date();
}

function normalizeText(value: string): string {
  return value.trim();
}

function normalizedCommand(value: string): string {
  return value.trim().toLowerCase();
}

function shouldRestart(text: string): boolean {
  return ["hola", "menu", "menú", "inicio", "empezar", "reiniciar"].includes(normalizedCommand(text));
}

function isGreeting(text: string): boolean {
  return text.length === 0 || shouldRestart(text);
}

function isHelp(text: string): boolean {
  return ["ayuda", "help"].includes(normalizedCommand(text));
}

function isCancel(text: string): boolean {
  return ["cancelar", "cancel", "salir"].includes(normalizedCommand(text));
}

function isBack(text: string): boolean {
  return ["volver", "atras", "atrás"].includes(normalizedCommand(text));
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatDay(value: string): string {
  const parts = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Argentina/Buenos_Aires"
  }).formatToParts(new Date(`${value}T12:00:00-03:00`));
  const weekday = parts.find((part) => part.type === "weekday")?.value.replace(".", "") ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value.replace(".", "") ?? "";

  return `${weekday} ${day} de ${month}`.trim();
}

function formatTime(value: string): string {
  const hour = new Intl.DateTimeFormat("es-AR", {
    hour: "numeric",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(new Date(value));

  return `${hour.padStart(2, "0")} h`;
}

function formatMoney(value: number): string {
  return `$${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0
  }).format(value)}`;
}

export function whatsappAvailabilityWindow() {
  return buildPublicAvailabilityWindow();
}
