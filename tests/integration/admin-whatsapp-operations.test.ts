import { describe, expect, it } from "vitest";
import {
  handleAdminWhatsAppResetRequest,
  listAdminWhatsAppConversations,
  resetAdminWhatsAppConversation,
  type AdminWhatsAppConversation,
  type AdminWhatsAppConversationState,
  type AdminWhatsAppRepository
} from "@/lib/admin/whatsapp-operations-service";

const business = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "achul-nails"
};

describe("admin WhatsApp operations", () => {
  it("rejects reset without an admin token", async () => {
    const repository = new FakeAdminWhatsAppRepository();

    const response = await handleAdminWhatsAppResetRequest({
      request: resetRequest({ phone: "+5491111111111" }),
      repository,
      adminApiKey: "secret",
      businessSlug: "achul-nails"
    });

    expect(response.status).toBe(401);
    expect(repository.conversations.get("+5491111111111")?.state).toBe("selecting_slot");
  });

  it("resets an existing conversation and clears context", async () => {
    const repository = new FakeAdminWhatsAppRepository();

    const result = await resetAdminWhatsAppConversation({
      repository,
      businessSlug: "achul-nails",
      phone: "5491111111111",
      now: new Date("2026-06-02T12:00:00.000Z")
    });

    const conversation = repository.conversations.get("+5491111111111");
    expect(result).toEqual({ phone: "+5491111111111", state: "greeting" });
    expect(conversation?.state).toBe("greeting");
    expect(conversation?.context).toEqual({});
    expect(conversation?.lastMessage).toBe("admin_reset");
    expect(conversation?.expiresAt).toBe("2026-06-03T00:00:00.000Z");
  });

  it("does not delete processed messages when resetting", async () => {
    const repository = new FakeAdminWhatsAppRepository();

    await resetAdminWhatsAppConversation({
      repository,
      businessSlug: "achul-nails",
      phone: "+5491111111111"
    });

    expect(repository.processedCounts["+5491111111111"]).toBe(3);
  });

  it("returns 404 when the phone has no conversation", async () => {
    const repository = new FakeAdminWhatsAppRepository();

    const response = await handleAdminWhatsAppResetRequest({
      request: resetRequest({ phone: "+5499999999999" }, "secret"),
      repository,
      adminApiKey: "secret",
      businessSlug: "achul-nails"
    });

    expect(response.status).toBe(404);
  });

  it("accepts admin token from cookie", async () => {
    const repository = new FakeAdminWhatsAppRepository();

    const response = await handleAdminWhatsAppResetRequest({
      request: new Request("http://localhost/api/admin/whatsapp/conversations/reset", {
        method: "POST",
        headers: { Cookie: "admin_api_key=secret" },
        body: JSON.stringify({ phone: "+5491111111111" })
      }),
      repository,
      adminApiKey: "secret",
      businessSlug: "achul-nails"
    });

    expect(response.status).toBe(200);
    expect(repository.conversations.get("+5491111111111")?.state).toBe("greeting");
  });

  it("lists conversations with labels, expiration and processed count", async () => {
    const repository = new FakeAdminWhatsAppRepository();

    const conversations = await listAdminWhatsAppConversations({
      repository,
      businessSlug: "achul-nails",
      limit: 10,
      now: new Date("2026-06-02T15:00:00.000Z")
    });

    expect(conversations).toHaveLength(1);
    expect(conversations[0]).toMatchObject({
      phone: "+5491111111111",
      stateLabel: "Eligiendo horario",
      suggestedAction: "Esperando seleccion de horario de la clienta.",
      displayContext: {
        serviceNames: ["Manicure semipermanente", "kapping gel"],
        professionalName: "Azul",
        selectedDayLabel: "miércoles, 3 de junio",
        selectedTimeLabel: "10:00"
      },
      processedMessagesCount: 3,
      isExpired: false
    });
  });

  it("uses clear fallbacks when referenced services or professionals are missing", async () => {
    const repository = new FakeAdminWhatsAppRepository();
    repository.serviceNames = {};
    repository.professionalNames = {};

    const conversations = await listAdminWhatsAppConversations({
      repository,
      businessSlug: "achul-nails",
      limit: 10,
      now: new Date("2026-06-02T15:00:00.000Z")
    });

    expect(conversations[0].displayContext.serviceNames).toEqual([
      "Servicio no encontrado (service-1)",
      "Servicio no encontrado (service-2)"
    ]);
    expect(conversations[0].displayContext.professionalName).toBe("Profesional no encontrado (professi...)");
  });

  it("suggests restarting when a conversation is expired", async () => {
    const repository = new FakeAdminWhatsAppRepository();

    const conversations = await listAdminWhatsAppConversations({
      repository,
      businessSlug: "achul-nails",
      now: new Date("2026-06-02T19:00:00.000Z")
    });

    expect(conversations[0].isExpired).toBe(true);
    expect(conversations[0].suggestedAction).toBe("Conversacion vencida: conviene reiniciar o pedir que escriba hola.");
  });
});

class FakeAdminWhatsAppRepository implements AdminWhatsAppRepository {
  conversations = new Map<
    string,
    Omit<AdminWhatsAppConversation, "stateLabel" | "suggestedAction" | "displayContext" | "processedMessagesCount" | "isExpired">
  >([
    [
      "+5491111111111",
      {
        id: "conversation-1",
        businessId: business.id,
        phone: "+5491111111111",
        state: "selecting_slot",
        context: {
          serviceIds: ["service-1", "service-2"],
          professionalId: "professional-1",
          selectedDate: "2026-06-03",
          startAt: "2026-06-03T13:00:00.000Z"
        },
        lastMessage: "3",
        expiresAt: "2026-06-02T18:00:00.000Z",
        createdAt: "2026-06-02T10:00:00.000Z",
        updatedAt: "2026-06-02T11:00:00.000Z"
      }
    ]
  ]);
  processedCounts: Record<string, number> = {
    "+5491111111111": 3
  };
  serviceNames: Record<string, string> = {
    "service-1": "Manicure semipermanente",
    "service-2": "kapping gel"
  };
  professionalNames: Record<string, string> = {
    "professional-1": "Azul"
  };

  async findBusinessBySlug(slug: string) {
    return slug === business.slug ? business : null;
  }

  async listConversations(input: {
    businessId: string;
    phone?: string;
    state?: AdminWhatsAppConversationState;
    limit: number;
  }) {
    return [...this.conversations.values()]
      .filter((conversation) => conversation.businessId === input.businessId)
      .filter((conversation) => (input.phone ? conversation.phone.includes(input.phone.replace(/^\+/, "")) : true))
      .filter((conversation) => (input.state ? conversation.state === input.state : true))
      .slice(0, input.limit);
  }

  async countProcessedMessages(input: { phones: string[] }) {
    return input.phones.reduce<Record<string, number>>((counts, phone) => {
      counts[phone] = this.processedCounts[phone] ?? 0;
      return counts;
    }, {});
  }

  async findServiceNames() {
    return this.serviceNames;
  }

  async findProfessionalNames() {
    return this.professionalNames;
  }

  async resetConversation(input: { phone: string; expiresAt: string }) {
    const conversation = this.conversations.get(input.phone);
    if (!conversation) return "not_found" as const;

    this.conversations.set(input.phone, {
      ...conversation,
      state: "greeting",
      context: {},
      lastMessage: "admin_reset",
      expiresAt: input.expiresAt
    });

    return "updated" as const;
  }
}

function resetRequest(body: { phone: string }, token?: string) {
  return new Request("http://localhost/api/admin/whatsapp/conversations/reset", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    body: JSON.stringify(body)
  });
}
