import { NextResponse } from "next/server";
import { createPublicBooking } from "@/lib/booking/public-booking-service";
import { SupabasePublicBookingRepository } from "@/lib/booking/supabase-public-booking-repository";
import type { PaymentService } from "@/lib/payments/payment-service";
import { MercadoPagoCheckoutService } from "@/lib/payments/mercado-pago-service";
import { buildPublicAvailabilityResponse } from "@/lib/public/public-availability-service";
import { whatsappAvailabilityWindow, handleWhatsAppBookingMessage } from "@/lib/whatsapp/conversation-service";
import { SupabasePublicAvailabilityRepository } from "@/lib/public/supabase-public-availability-repository";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { whatsappGatewayFromEnvironment } from "@/lib/notifications/whatsapp-adapter";
import { SupabaseWhatsAppConversationRepository } from "@/lib/whatsapp/supabase-conversation-repository";
import { SupabaseProcessedWhatsAppMessageRepository } from "@/lib/whatsapp/supabase-processed-message-repository";
import type { WhatsAppGateway } from "@/lib/notifications/whatsapp-adapter";

type MetaInboundMessage = {
  id: string;
  from: string;
  text: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.META_WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }

  return NextResponse.json({ error: "Verificacion invalida" }, { status: 403 });
}

export async function POST(request: Request) {
  return handleWhatsAppWebhookPost(request, whatsappGatewayFromEnvironment());
}

async function handleWhatsAppWebhookPost(request: Request, gateway: WhatsAppGateway | null) {
  const body = await request.json().catch(() => null);
  const inboundMessages = extractInboundMessages(body);
  if (inboundMessages.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const supabase = createSupabaseServiceClient();
  const conversationRepository = new SupabaseWhatsAppConversationRepository(supabase);
  const processedMessageRepository = new SupabaseProcessedWhatsAppMessageRepository(supabase);
  const availabilityRepository = new SupabasePublicAvailabilityRepository(supabase);
  const bookingRepository = new SupabasePublicBookingRepository(supabase);
  const businessSlug = process.env.WHATSAPP_BUSINESS_SLUG || "achul-nails";
  let processed = 0;

  for (const inbound of inboundMessages) {
    if (await processedMessageRepository.hasProcessedMessage(inbound.id)) {
      continue;
    }

    const normalizedFrom = normalizeInboundPhone(inbound.from);
    const reply = await handleWhatsAppBookingMessage(
      {
        repository: conversationRepository,
        loadAvailability: async (input) => {
          const window = whatsappAvailabilityWindow();
          return buildPublicAvailabilityResponse(availabilityRepository, {
            businessSlug: input.businessSlug,
            serviceIds: input.serviceIds,
            professionalId: input.professionalId,
            from: window.from,
            to: window.to
          });
        },
        createBooking: (input) =>
          createPublicBooking(bookingRepository, paymentServiceForEnvironment(), input)
      },
      {
        businessSlug,
        from: normalizedFrom,
        text: inbound.text
      }
    ).catch((error) => null);

    if (!reply) {
      console.error("WhatsApp conversation failed for inbound message", inbound.id);
      continue;
    }

    const claimed = await processedMessageRepository.recordProcessedMessage({
      messageId: inbound.id,
      businessId: reply.businessId,
      phone: normalizedFrom
    });
    if (!claimed) {
      continue;
    }

    let replySent = false;
    if (!gateway) {
      console.error("WhatsApp reply skipped because no gateway is configured");
    } else {
      await gateway.sendMessage({
        to: reply.to,
        message: reply.message
      }).then(() => {
        replySent = true;
      }).catch((error) => {
        console.error("WhatsApp reply failed", error);
      });
    }

    if (replySent) {
      await conversationRepository.saveConversation(reply.conversation);
      processed += 1;
    }
  }

  return NextResponse.json({ ok: true, processed });
}

function extractInboundMessages(body: unknown): MetaInboundMessage[] {
  if (!body || typeof body !== "object") {
    return [];
  }

  const entries = arrayField(body as Record<string, unknown>, "entry");
  const messages: MetaInboundMessage[] = [];

  for (const entry of entries) {
    for (const change of arrayField(entry, "changes")) {
      const value = objectField(change, "value");
      for (const message of arrayField(value, "messages")) {
        const text = objectField(message, "text");
        const bodyText = text.body ?? interactiveReplyId(message);
        const from = message.from;
        const id = message.id;
        if (typeof id === "string" && typeof from === "string" && typeof bodyText === "string") {
          messages.push({ id, from, text: bodyText });
        }
      }
    }
  }

  return messages;
}

function interactiveReplyId(row: Record<string, unknown>): unknown {
  const interactive = objectField(row, "interactive");
  const buttonReply = objectField(interactive, "button_reply");
  if (typeof buttonReply.id === "string") {
    return buttonReply.id;
  }

  const listReply = objectField(interactive, "list_reply");
  if (typeof listReply.id === "string") {
    return listReply.id;
  }

  return null;
}

function objectField(row: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = row[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayField(row: Record<string, unknown>, key: string): Array<Record<string, unknown>> {
  const value = row[key];
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeInboundPhone(value: string): string {
  const digits = value.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

function paymentServiceForEnvironment(): PaymentService {
  if (process.env.E2E_TEST_MODE === "true") {
    return {
      async createCheckoutPreference(input) {
        const providerPaymentId = `e2e-${input.appointmentId}`;
        return {
          providerPreferenceId: providerPaymentId,
          checkoutUrl: `/e2e/checkout?appointmentId=${input.appointmentId}&providerPaymentId=${providerPaymentId}`
        };
      }
    };
  }

  return new MercadoPagoCheckoutService();
}
