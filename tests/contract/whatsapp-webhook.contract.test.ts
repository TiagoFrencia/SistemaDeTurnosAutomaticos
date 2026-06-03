import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/whatsapp/webhook/route";
import type { WhatsAppOutboundMessage } from "@/lib/notifications/whatsapp-adapter";

const hoisted = vi.hoisted(() => ({
  supabase: createFakeSupabase(),
  gateway: null as null | { sendMessage(input: { to: string; message: WhatsAppOutboundMessage }): Promise<{ providerMessageId?: string }> }
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: () => hoisted.supabase
}));

vi.mock("@/lib/notifications/whatsapp-adapter", () => ({
  whatsappGatewayFromEnvironment: () => hoisted.gateway
}));

vi.mock("@/lib/public/supabase-public-availability-repository", () => ({
  SupabasePublicAvailabilityRepository: class {
    async load() {
      return {
        business: {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Achul_Nails",
          slug: "achul-nails",
          address: null,
          active: true,
          branding: {
            primaryColor: "#24594c",
            themePreset: "editorial_green",
            heroText: "Turnos confirmados para que tu horario quede cuidado desde el primer clic.",
            visualMode: "default",
            logoUrl: null
          }
        },
        services: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Manicure",
            durationMinutes: 60,
            priceAmount: 5000,
            depositAmount: 1500,
            active: true
          }
        ],
        professionals: [{ id: "33333333-3333-4333-8333-333333333333", name: "Azul", active: true }],
        businessHours: [],
        appointments: [],
        blocks: []
      };
    }
  }
}));

describe("WhatsApp webhook contract", () => {
  afterEach(() => {
    delete process.env.META_WHATSAPP_VERIFY_TOKEN;
  });

  it("returns the Meta challenge when the verify token matches", async () => {
    process.env.META_WHATSAPP_VERIFY_TOKEN = "verify-me";

    const response = await GET(
      new Request(
        "http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=abc123"
      )
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("abc123");
  });

  it("rejects invalid verify tokens", async () => {
    process.env.META_WHATSAPP_VERIFY_TOKEN = "verify-me";

    const response = await GET(
      new Request(
        "http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123"
      )
    );

    expect(response.status).toBe(403);
  });

  it("deduplicates repeated Meta messages and advances the conversation once", async () => {
    hoisted.supabase.reset();
    const gateway = new FakeGateway();
    hoisted.gateway = gateway;
    const request = new Request("http://localhost/api/whatsapp/webhook", {
      method: "POST",
      body: JSON.stringify(metaTextPayload({ id: "wamid-1", from: "5491111111111", text: "hola" }))
    });

    const first = await POST(request);
    const second = await POST(
      new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        body: JSON.stringify(metaTextPayload({ id: "wamid-1", from: "5491111111111", text: "hola" }))
      })
    );

    await expect(first.json()).resolves.toEqual({ ok: true, processed: 1 });
    await expect(second.json()).resolves.toEqual({ ok: true, processed: 0 });
    expect(gateway.messages).toHaveLength(1);
    expect(gateway.messages[0]?.message).toMatchObject({ kind: "list" });
    expect(hoisted.supabase.conversations).toHaveLength(1);
    expect(hoisted.supabase.processedMessages).toHaveLength(1);
  });

  it("extracts interactive button replies", async () => {
    hoisted.supabase.reset();
    const gateway = new FakeGateway();
    hoisted.gateway = gateway;
    await POST(
      new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        body: JSON.stringify(metaTextPayload({ id: "wamid-start", from: "5491111111111", text: "hola" }))
      })
    );

    const response = await POST(
      new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        body: JSON.stringify(metaInteractivePayload({ id: "wamid-button", from: "5491111111111", type: "button_reply", replyId: "cancel" }))
      })
    );

    await expect(response.json()).resolves.toEqual({ ok: true, processed: 1 });
    expect(gateway.messages.at(-1)?.message).toMatchObject({ kind: "list" });
  });

  it("extracts interactive list replies", async () => {
    hoisted.supabase.reset();
    const gateway = new FakeGateway();
    hoisted.gateway = gateway;
    await POST(
      new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        body: JSON.stringify(metaTextPayload({ id: "wamid-start-list", from: "5491111111111", text: "hola" }))
      })
    );

    const response = await POST(
      new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        body: JSON.stringify(metaInteractivePayload({
          id: "wamid-list",
          from: "5491111111111",
          type: "list_reply",
          replyId: "service:22222222-2222-4222-8222-222222222222"
        }))
      })
    );

    await expect(response.json()).resolves.toEqual({ ok: true, processed: 1 });
    expect(gateway.messages.at(-1)?.message).toMatchObject({ kind: "buttons" });
  });

  it("does not save conversation state when reply delivery fails, but keeps the processed marker to stop retries", async () => {
    hoisted.supabase.reset();
    hoisted.gateway = new FailingGateway();
    const response = await POST(
      new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        body: JSON.stringify(metaTextPayload({ id: "wamid-fail", from: "5491111111111", text: "hola" }))
      })
    );

    await expect(response.json()).resolves.toEqual({ ok: true, processed: 0 });
    expect(hoisted.supabase.conversations).toHaveLength(0);
    expect(hoisted.supabase.processedMessages).toHaveLength(1);
  });

  it("claims duplicated Meta messages atomically before sending a reply", async () => {
    hoisted.supabase.reset();
    const gateway = new SlowGateway();
    hoisted.gateway = gateway;
    const requests = Array.from({ length: 4 }, () =>
      POST(
        new Request("http://localhost/api/whatsapp/webhook", {
          method: "POST",
          body: JSON.stringify(metaTextPayload({ id: "wamid-race", from: "5491111111111", text: "hola" }))
        })
      )
    );

    const responses = await Promise.all(requests);
    const payloads = await Promise.all(responses.map((response) => response.json()));

    expect(payloads.filter((payload) => payload.processed === 1)).toHaveLength(1);
    expect(payloads.filter((payload) => payload.processed === 0)).toHaveLength(3);
    expect(gateway.messages).toHaveLength(1);
    expect(hoisted.supabase.processedMessages).toHaveLength(1);
  });
});

function metaTextPayload(input: { id: string; from: string; text: string }) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-1",
        changes: [
          {
            value: {
              messages: [
                {
                  id: input.id,
                  from: input.from,
                  text: { body: input.text }
                }
              ]
            }
          }
        ]
      }
    ]
  };
}

function metaInteractivePayload(input: { id: string; from: string; type: "button_reply" | "list_reply"; replyId: string }) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-1",
        changes: [
          {
            value: {
              messages: [
                {
                  id: input.id,
                  from: input.from,
                  interactive: {
                    [input.type]: {
                      id: input.replyId,
                      title: input.replyId
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  };
}

class FakeGateway {
  readonly messages: Array<{ to: string; message: WhatsAppOutboundMessage }> = [];

  async sendMessage(input: { to: string; message: WhatsAppOutboundMessage }) {
    this.messages.push(input);
    return { providerMessageId: "wa-1" };
  }
}

class FailingGateway {
  async sendMessage(): Promise<{ providerMessageId?: string }> {
    throw new Error("Meta unavailable");
  }
}

class SlowGateway extends FakeGateway {
  async sendMessage(input: { to: string; message: WhatsAppOutboundMessage }) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    return super.sendMessage(input);
  }
}

function createFakeSupabase() {
  const state = {
    conversations: [] as Record<string, unknown>[],
    processedMessages: [] as Record<string, unknown>[],
    reset() {
      state.conversations = [];
      state.processedMessages = [];
    },
    from(table: string) {
      return tableQuery(state, table);
    }
  };
  return state;
}

function tableQuery(state: ReturnType<typeof createFakeSupabase>, table: string) {
  const filters: Record<string, unknown> = {};
  const query = {
    select: () => query,
    eq: (key: string, value: unknown) => {
      filters[key] = value;
      return query;
    },
    maybeSingle: async () => {
      if (table === "businesses") {
        return {
          data: {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Achul_Nails",
            slug: "achul-nails",
            active: true
          },
          error: null
        };
      }
      if (table === "whatsapp_conversations") {
        return {
          data:
            state.conversations.find(
              (row) => row.business_id === filters.business_id && row.phone === filters.phone
            ) ?? null,
          error: null
        };
      }
      if (table === "whatsapp_processed_messages") {
        return {
          data:
            state.processedMessages.find((row) => row.message_id === filters.message_id) ?? null,
          error: null
        };
      }
      return { data: null, error: null };
    },
    upsert: async (row: Record<string, unknown>) => {
      const index = state.conversations.findIndex(
        (existing) => existing.business_id === row.business_id && existing.phone === row.phone
      );
      if (index >= 0) {
        state.conversations[index] = row;
      } else {
        state.conversations.push(row);
      }
      return { error: null };
    },
    insert: async (row: Record<string, unknown>) => {
      if (
        table === "whatsapp_processed_messages" &&
        state.processedMessages.some((existing) => existing.message_id === row.message_id)
      ) {
        return { error: { code: "23505" } };
      }
      state.processedMessages.push(row);
      return { error: null };
    }
  };
  return query;
}
