import { NextResponse } from "next/server";
import { processPaymentWebhook, type PersistedMercadoPagoWebhookEvent } from "@/lib/booking/payment-webhook-service";
import { SupabasePaymentWebhookRepository } from "@/lib/booking/supabase-payment-webhook-repository";
import { buildNotificationService } from "@/lib/notifications/build-notification-service";
import { MercadoPagoPaymentReader } from "@/lib/payments/mercado-pago-payment-reader";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { mercadoPagoWebhookSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const event = await parseWebhookEvent(request, body);

  if (!event) {
    return NextResponse.json({ error: "Notificacion de Mercado Pago invalida" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  await processPaymentWebhook(
    new SupabasePaymentWebhookRepository(supabase),
    buildNotificationService(supabase),
    event
  );

  return NextResponse.json({ ok: true });
}

async function parseWebhookEvent(
  request: Request,
  body: unknown
): Promise<PersistedMercadoPagoWebhookEvent | null> {
  const internalEvent = mercadoPagoWebhookSchema.safeParse(body);
  if (internalEvent.success) {
    return internalEvent.data;
  }

  const providerPaymentId = getProviderPaymentId(request, body);
  if (!providerPaymentId) {
    return null;
  }

  return new MercadoPagoPaymentReader().readPayment(providerPaymentId);
}

function getProviderPaymentId(request: Request, body: unknown): string | null {
  const url = new URL(request.url);
  const queryId = url.searchParams.get("id") || url.searchParams.get("data.id");
  if (queryId) {
    return queryId;
  }

  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;
  const data = payload.data;
  if (data && typeof data === "object") {
    const id = (data as Record<string, unknown>).id;
    return id === undefined || id === null ? null : String(id);
  }

  return null;
}
