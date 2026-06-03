import type {
  NotificationAdapter,
  NotificationRequest,
  NotificationResult
} from "@/lib/notifications/notification-service";

export type WhatsAppMessageInput = {
  to: string;
  message: WhatsAppOutboundMessage;
};

export type WhatsAppMessageResult = {
  providerMessageId?: string;
};

export type WhatsAppOutboundMessage =
  | {
      kind: "text";
      body: string;
      previewUrl?: boolean;
    }
  | {
      kind: "buttons";
      body: string;
      buttons: Array<{ id: string; title: string }>;
      fallbackText: string;
    }
  | {
      kind: "list";
      body: string;
      buttonText: string;
      sections: Array<{
        title?: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>;
      fallbackText: string;
    }
  | {
      kind: "cta_url";
      body: string;
      buttonText: string;
      url: string;
      fallbackText: string;
    };

export type WhatsAppGateway = {
  sendMessage(input: WhatsAppMessageInput): Promise<WhatsAppMessageResult>;
};

export class WhatsAppNotificationAdapter implements NotificationAdapter {
  readonly channel = "whatsapp" as const;

  constructor(private readonly gateway: WhatsAppGateway) {}

  async send(request: NotificationRequest): Promise<NotificationResult> {
    try {
      const response = await this.gateway.sendMessage({
        to: request.recipient,
        message: textWhatsAppMessage(renderWhatsAppMessage(request))
      });

      return {
        status: "sent",
        providerMessageId: response.providerMessageId
      };
    } catch (error) {
      return {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown WhatsApp send error"
      };
    }
  }
}

export class FakeWhatsAppGateway implements WhatsAppGateway {
  readonly messages: WhatsAppMessageInput[] = [];

  async sendMessage(input: WhatsAppMessageInput): Promise<WhatsAppMessageResult> {
    this.messages.push(input);
    return { providerMessageId: `fake-wa-${this.messages.length}` };
  }
}

export class MetaWhatsAppGateway implements WhatsAppGateway {
  constructor(
    private readonly phoneNumberId: string,
    private readonly accessToken: string
  ) {}

  async sendMessage(input: WhatsAppMessageInput): Promise<WhatsAppMessageResult> {
    const to = normalizePhoneForMeta(input.to);
    const response = await this.sendPayload(to, input.message);

    const payload = (await response.json().catch(() => null)) as
      | { messages?: Array<{ id?: string }>; error?: { message?: string } }
      | null;

    if (!response.ok) {
      if (input.message.kind === "cta_url") {
        return this.sendMessage({
          ...input,
          message: textWhatsAppMessage(input.message.fallbackText)
        });
      }

      const alternateTo = argentinaAllowedListFallback(to);
      if (alternateTo) {
        return this.sendMessage({ ...input, to: alternateTo });
      }

      throw new Error(payload?.error?.message ?? `Meta WhatsApp error ${response.status}`);
    }

    return { providerMessageId: payload?.messages?.[0]?.id };
  }

  private sendPayload(to: string, message: WhatsAppOutboundMessage) {
    return fetch(`https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        ...metaMessagePayload(message)
      })
    });
  }
}

export function whatsappAdapterFromEnvironment(): WhatsAppNotificationAdapter | null {
  const gateway = whatsappGatewayFromEnvironment();
  return gateway ? new WhatsAppNotificationAdapter(gateway) : null;
}

export function whatsappGatewayFromEnvironment(): WhatsAppGateway | null {
  const provider = process.env.WHATSAPP_PROVIDER;
  if (!provider) {
    return null;
  }

  if (provider === "fake") {
    return new FakeWhatsAppGateway();
  }

  if (provider === "meta") {
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
    if (!phoneNumberId || !accessToken) {
      return null;
    }

    return new MetaWhatsAppGateway(phoneNumberId, accessToken);
  }

  return null;
}

export function renderWhatsAppMessage(request: NotificationRequest): string {
  const customerName = stringPayload(request, "customerName") ?? "!";
  const serviceName = stringPayload(request, "serviceName") ?? "tu servicio";
  const startAt = stringPayload(request, "startAt");
  const checkoutUrl = stringPayload(request, "checkoutUrl");

  if (request.templateKey === "booking.reminder") {
    return [
      `Hola ${customerName}, te recordamos tu turno de ${serviceName}.`,
      startAt ? `Horario: ${formatDisplayDate(startAt)}.` : null,
      "Si no podes asistir, avisanos para liberar el horario."
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (request.templateKey === "booking.confirmed") {
    return [
      `Hola ${customerName}, tu turno de ${serviceName} fue confirmado.`,
      startAt ? `Horario: ${formatDisplayDate(startAt)}.` : null,
      checkoutUrl ? `Link de pago: ${checkoutUrl}` : null
    ]
      .filter(Boolean)
      .join("\n");
  }

  return `Hola ${customerName}, tenemos una actualizacion sobre tu turno.`;
}

export function textWhatsAppMessage(body: string, previewUrl = true): WhatsAppOutboundMessage {
  return {
    kind: "text",
    body,
    previewUrl
  };
}

function metaMessagePayload(message: WhatsAppOutboundMessage) {
  if (message.kind === "text") {
    return {
      type: "text",
      text: {
        preview_url: message.previewUrl ?? true,
        body: message.body
      }
    };
  }

  if (message.kind === "buttons") {
    return {
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: message.body },
        action: {
          buttons: message.buttons.slice(0, 3).map((button) => ({
            type: "reply",
            reply: {
              id: button.id,
              title: button.title
            }
          }))
        }
      }
    };
  }

  if (message.kind === "list") {
    return {
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: message.body },
        action: {
          button: message.buttonText,
          sections: message.sections.map((section) => ({
            title: section.title,
            rows: section.rows.slice(0, 10).map((row) => ({
              id: row.id,
              title: row.title,
              description: row.description
            }))
          }))
        }
      }
    };
  }

  return {
    type: "interactive",
    interactive: {
      type: "cta_url",
      body: { text: message.body },
      action: {
        name: "cta_url",
        parameters: {
          display_text: message.buttonText,
          url: message.url
        }
      }
    }
  };
}

function stringPayload(request: NotificationRequest, key: string): string | null {
  const value = request.payload[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function formatDisplayDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(date);
}

function normalizePhoneForMeta(value: string): string {
  return value.replace(/^whatsapp:/, "").replace(/[^\d]/g, "");
}

function argentinaAllowedListFallback(value: string): string | null {
  return value.startsWith("549") ? `54${value.slice(3)}` : null;
}
