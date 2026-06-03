import { NextResponse } from "next/server";
import { expirePendingPaymentHolds } from "@/lib/booking/pending-payment-expiry-service";
import { SupabasePendingPaymentExpiryRepository } from "@/lib/booking/supabase-pending-payment-expiry-repository";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const HOLD_EXPIRY_MINUTES = 30;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await expirePendingPaymentHolds(
    new SupabasePendingPaymentExpiryRepository(createSupabaseServiceClient()),
    new Date(),
    HOLD_EXPIRY_MINUTES
  );
  return NextResponse.json(result);
}

function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}
