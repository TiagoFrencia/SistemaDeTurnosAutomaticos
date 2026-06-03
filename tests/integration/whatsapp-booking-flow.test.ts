import { describe, expect, it } from "vitest";
import type { PublicBookingInput, PublicBookingResult } from "@/lib/booking/public-booking-service";
import type { PublicAvailabilityResponse } from "@/lib/public/public-availability-service";
import {
  handleWhatsAppBookingMessage,
  type WhatsAppBusiness,
  type WhatsAppConversation,
  type WhatsAppConversationRepository
} from "@/lib/whatsapp/conversation-service";

const serviceId = "22222222-2222-4222-8222-222222222222";
const secondServiceId = "22222222-2222-4222-8222-222222222223";
const professionalId = "33333333-3333-4333-8333-333333333333";

describe("WhatsApp booking flow", () => {
  it("guides the customer through summary confirmation and creates a paid hold only after confirmation", async () => {
    const repository = new FakeConversationRepository();
    let capturedBooking: PublicBookingInput | undefined;
    let bookingCalls = 0;

    const dependencies = buildDependencies(repository, async (input) => {
      bookingCalls += 1;
      capturedBooking = input;
      return checkoutResult(input);
    });

    const replies = [];
    for (const text of ["hola", "1,2", "1", "1", "1", "Ana Perez", "ana@example.com"]) {
      const result = await send(dependencies, repository, text);
      replies.push(result.reply);
    }

    expect(replies[0]).toContain("Elegí servicio");
    expect(replies[0]).toContain("Seña");
    expect(replies[2]).toContain("Elegí un día");
    expect(replies[2]).toContain("lun 1 de jun");
    expect(replies[3]).toContain("09 h");
    expect(replies[6]).toContain("Revisá tu reserva");
    expect(replies[6]).toContain("1) Confirmar y pagar");
    expect(bookingCalls).toBe(0);

    const invalidConfirmation = await send(dependencies, repository, "x");
    expect(invalidConfirmation.reply).toContain("Respondé 1 para confirmar");
    expect(invalidConfirmation.reply).not.toContain("Revisá tu reserva");
    expect(bookingCalls).toBe(0);

    const confirmation = await send(dependencies, repository, "1");

    expect(confirmation.reply).toContain("Pagá acá");
    expect(confirmation.reply).toContain("https://mercadopago.test/checkout");
    expect(confirmation.reply).toContain("No aceptamos efectivo por WhatsApp");
    expect(bookingCalls).toBe(1);
    expect(capturedBooking).toMatchObject({
      businessSlug: "achul-nails",
      serviceIds: [serviceId, secondServiceId],
      professionalId,
      startAt: "2026-06-01T09:00:00-03:00",
      customer: {
        fullName: "Ana Perez",
        phone: "+5491111111111",
        email: "ana@example.com"
      }
    });
  });

  it("supports help without advancing the current state", async () => {
    const repository = new FakeConversationRepository();
    const dependencies = buildDependencies(repository);

    await send(dependencies, repository, "hola");
    await send(dependencies, repository, "1");
    const before = await repository.loadConversation();
    const result = await send(dependencies, repository, "ayuda");
    const after = await repository.loadConversation();

    expect(result.reply).toContain("Elegí profesional");
    expect(after?.state).toBe(before?.state);
    expect(after?.context).toEqual(before?.context);
  });

  it("goes back one step from professional, day and slot selections", async () => {
    const repository = new FakeConversationRepository();
    const dependencies = buildDependencies(repository);

    await send(dependencies, repository, "hola");
    await send(dependencies, repository, "1");
    let result = await send(dependencies, repository, "volver");
    expect(result.reply).toContain("Elegí servicio");
    expect((await repository.loadConversation())?.state).toBe("selecting_services");

    await send(dependencies, repository, "1");
    await send(dependencies, repository, "1");
    result = await send(dependencies, repository, "volver");
    expect(result.reply).toContain("Elegí profesional");
    expect((await repository.loadConversation())?.state).toBe("selecting_professional");

    await send(dependencies, repository, "1");
    await send(dependencies, repository, "1");
    result = await send(dependencies, repository, "volver");
    expect(result.reply).toContain("Elegí un día");
    expect((await repository.loadConversation())?.state).toBe("selecting_day");
  });

  it("cancels the current selection and clears context", async () => {
    const repository = new FakeConversationRepository();
    const dependencies = buildDependencies(repository);

    await send(dependencies, repository, "hola");
    await send(dependencies, repository, "1,2");
    const result = await send(dependencies, repository, "cancelar");
    const conversation = await repository.loadConversation();

    expect(result.reply).toContain("cancelé esta reserva");
    expect(result.reply).toContain("Elegí servicio");
    expect(conversation?.state).toBe("selecting_services");
    expect(conversation?.context).toEqual({});
  });

  it("can change the slot from the summary before creating a hold", async () => {
    const repository = new FakeConversationRepository();
    let bookingCalls = 0;
    const dependencies = buildDependencies(repository, async (input) => {
      bookingCalls += 1;
      return checkoutResult(input);
    });

    for (const text of ["hola", "1", "1", "1", "1", "Ana Perez", "ana@example.com"]) {
      await send(dependencies, repository, text);
    }

    const changeSlot = await send(dependencies, repository, "2");
    expect(changeSlot.reply).toContain("Elegí un horario");
    expect((await repository.loadConversation())?.state).toBe("selecting_slot");
    expect(bookingCalls).toBe(0);
  });

  it("keeps the conversation alive when the customer sends an invalid option", async () => {
    const repository = new FakeConversationRepository();
    const result = await handleWhatsAppBookingMessage(
      {
        repository,
        loadAvailability: async () => availability(),
        createBooking: async () => {
          throw new Error("Should not create a booking");
        }
      },
      {
        businessSlug: "achul-nails",
        from: "+5491111111111",
        text: "9"
      }
    );

    expect(result.reply).toContain("Elegí servicio");
  });

  it("uses interactive ids for services, actions, day, slot and payment CTA", async () => {
    const repository = new FakeConversationRepository();
    let capturedBooking: PublicBookingInput | undefined;
    const dependencies = buildDependencies(repository, async (input) => {
      capturedBooking = input;
      return checkoutResult(input);
    });

    const greeting = await send(dependencies, repository, "hola");
    expect(greeting.message).toMatchObject({
      kind: "list",
      buttonText: "Elegir servicio"
    });

    const service = await send(dependencies, repository, `service:${serviceId}`);
    expect(service.message).toMatchObject({
      kind: "buttons",
      buttons: [
        { id: "add_service" },
        { id: "continue_services" },
        { id: "cancel" }
      ]
    });

    const days = await send(dependencies, repository, "continue_services");
    expect(days.message).toMatchObject({
      kind: "list",
      buttonText: "Ver días"
    });

    const slots = await send(dependencies, repository, "day:2026-06-01");
    expect(slots.message).toMatchObject({
      kind: "list",
      buttonText: "Ver horarios"
    });

    await send(dependencies, repository, "slot:2026-06-01T09:00:00-03:00");
    await send(dependencies, repository, "Ana Perez");
    const summary = await send(dependencies, repository, "ana@example.com");
    expect(summary.message).toMatchObject({
      kind: "buttons",
      buttons: [
        { id: "confirm_booking" },
        { id: "change_slot" },
        { id: "cancel" }
      ]
    });

    const payment = await send(dependencies, repository, "confirm_booking");
    expect(payment.message).toMatchObject({
      kind: "cta_url",
      buttonText: "Pagar seña",
      url: "https://mercadopago.test/checkout"
    });
    expect(capturedBooking).toMatchObject({
      serviceIds: [serviceId],
      professionalId,
      startAt: "2026-06-01T09:00:00-03:00"
    });
  });
});

function buildDependencies(
  repository: FakeConversationRepository,
  createBooking: (input: PublicBookingInput) => Promise<PublicBookingResult> = checkoutResult
) {
  return {
    repository,
    loadAvailability: async () => availability(),
    createBooking,
    now: () => new Date("2026-06-01T08:00:00-03:00")
  };
}

async function send(
  dependencies: ReturnType<typeof buildDependencies>,
  repository: FakeConversationRepository,
  text: string
) {
  const result = await handleWhatsAppBookingMessage(dependencies, {
    businessSlug: "achul-nails",
    from: "+5491111111111",
    text
  });
  await repository.saveConversation(result.conversation);
  return result;
}

async function checkoutResult(input: PublicBookingInput): Promise<PublicBookingResult> {
  return {
    appointmentId: "apt-1",
    startAt: input.startAt,
    endAt: "2026-06-01T11:30:00-03:00",
    status: "pending_payment",
    providerPreferenceId: "pref-1",
    checkoutUrl: "https://mercadopago.test/checkout"
  };
}

function availability(): PublicAvailabilityResponse {
  return {
    business: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Achul_Nails",
      slug: "achul-nails",
      address: null,
      branding: {
        primaryColor: "#24594c",
        themePreset: "editorial_green",
        heroText: "Turnos confirmados para que tu horario quede cuidado desde el primer clic.",
        visualMode: "default",
        logoUrl: null
      }
    },
    service: {
      id: serviceId,
      name: "2 servicios",
      durationMinutes: 150,
      priceAmount: 13000,
      depositAmount: 4000
    },
    services: [
      {
        id: serviceId,
        name: "Manicure",
        durationMinutes: 60,
        priceAmount: 5000,
        depositAmount: 1500
      },
      {
        id: secondServiceId,
        name: "Kapping",
        durationMinutes: 90,
        priceAmount: 8000,
        depositAmount: 2500
      }
    ],
    selectedServices: [],
    selectedServiceId: serviceId,
    selectedServiceIds: [serviceId, secondServiceId],
    professionals: [{ id: professionalId, name: "Azul" }],
    selectedProfessionalId: professionalId,
    slots: [
      {
        startAt: "2026-06-01T09:00:00-03:00",
        endAt: "2026-06-01T11:30:00-03:00"
      },
      {
        startAt: "2026-06-02T10:00:00-03:00",
        endAt: "2026-06-02T12:30:00-03:00"
      }
    ]
  };
}

class FakeConversationRepository implements WhatsAppConversationRepository {
  private conversation: WhatsAppConversation | null = null;
  private readonly business: WhatsAppBusiness = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Achul_Nails",
    slug: "achul-nails",
    active: true
  };

  async loadBusinessBySlug(): Promise<WhatsAppBusiness | null> {
    return this.business;
  }

  async loadConversation(): Promise<WhatsAppConversation | null> {
    return this.conversation;
  }

  async saveConversation(conversation: WhatsAppConversation): Promise<void> {
    this.conversation = conversation;
  }
}
