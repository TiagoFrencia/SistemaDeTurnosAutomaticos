import { afterEach, describe, expect, it, vi } from "vitest";
import { MetaWhatsAppGateway } from "@/lib/notifications/whatsapp-adapter";

describe("MetaWhatsAppGateway", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("serializes text messages", async () => {
    const fetchMock = successFetch();
    vi.stubGlobal("fetch", fetchMock);

    await new MetaWhatsAppGateway("phone-1", "token-1").sendMessage({
      to: "+5491111111111",
      message: { kind: "text", body: "Hola", previewUrl: false }
    });

    expect(requestBody(fetchMock)).toMatchObject({
      messaging_product: "whatsapp",
      to: "5491111111111",
      type: "text",
      text: {
        preview_url: false,
        body: "Hola"
      }
    });
  });

  it("serializes reply buttons", async () => {
    const fetchMock = successFetch();
    vi.stubGlobal("fetch", fetchMock);

    await new MetaWhatsAppGateway("phone-1", "token-1").sendMessage({
      to: "+5491111111111",
      message: {
        kind: "buttons",
        body: "Revisá tu reserva",
        buttons: [
          { id: "confirm_booking", title: "Confirmar y pagar" },
          { id: "change_slot", title: "Cambiar horario" }
        ],
        fallbackText: "1) Confirmar"
      }
    });

    expect(requestBody(fetchMock)).toMatchObject({
      type: "interactive",
      interactive: {
        type: "button",
        action: {
          buttons: [
            { type: "reply", reply: { id: "confirm_booking", title: "Confirmar y pagar" } },
            { type: "reply", reply: { id: "change_slot", title: "Cambiar horario" } }
          ]
        }
      }
    });
  });

  it("serializes list messages", async () => {
    const fetchMock = successFetch();
    vi.stubGlobal("fetch", fetchMock);

    await new MetaWhatsAppGateway("phone-1", "token-1").sendMessage({
      to: "+5491111111111",
      message: {
        kind: "list",
        body: "Elegí servicio",
        buttonText: "Elegir servicio",
        sections: [
          {
            title: "Servicios",
            rows: [{ id: "service:1", title: "Manicure", description: "60 min" }]
          }
        ],
        fallbackText: "1) Manicure"
      }
    });

    expect(requestBody(fetchMock)).toMatchObject({
      type: "interactive",
      interactive: {
        type: "list",
        action: {
          button: "Elegir servicio",
          sections: [
            {
              title: "Servicios",
              rows: [{ id: "service:1", title: "Manicure", description: "60 min" }]
            }
          ]
        }
      }
    });
  });

  it("serializes CTA URL messages and falls back to text if Meta rejects them", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ error: { message: "Unsupported interactive type" } }, false))
      .mockResolvedValueOnce(response({ messages: [{ id: "wa-fallback" }] }, true));
    vi.stubGlobal("fetch", fetchMock);

    await new MetaWhatsAppGateway("phone-1", "token-1").sendMessage({
      to: "+5491111111111",
      message: {
        kind: "cta_url",
        body: "Pagá la seña",
        buttonText: "Pagar seña",
        url: "https://mercadopago.test/checkout",
        fallbackText: "Pagá acá:\nhttps://mercadopago.test/checkout"
      }
    });

    expect(requestBody(fetchMock, 0)).toMatchObject({
      type: "interactive",
      interactive: {
        type: "cta_url",
        action: {
          name: "cta_url",
          parameters: {
            display_text: "Pagar seña",
            url: "https://mercadopago.test/checkout"
          }
        }
      }
    });
    expect(requestBody(fetchMock, 1)).toMatchObject({
      type: "text",
      text: {
        body: "Pagá acá:\nhttps://mercadopago.test/checkout"
      }
    });
  });
});

function successFetch() {
  return vi.fn().mockResolvedValue(response({ messages: [{ id: "wa-1" }] }, true));
}

function response(payload: unknown, ok: boolean) {
  return {
    ok,
    status: ok ? 200 : 400,
    json: async () => payload
  };
}

function requestBody(fetchMock: ReturnType<typeof vi.fn>, callIndex = 0) {
  const init = fetchMock.mock.calls[callIndex]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body));
}
