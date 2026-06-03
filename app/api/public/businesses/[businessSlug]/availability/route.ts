import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { expirePendingPaymentHolds } from "@/lib/booking/pending-payment-expiry-service";
import { SupabasePendingPaymentExpiryRepository } from "@/lib/booking/supabase-pending-payment-expiry-repository";
import {
  buildPublicAvailabilityResponse,
  PublicAvailabilityError
} from "@/lib/public/public-availability-service";
import { SupabasePublicAvailabilityRepository } from "@/lib/public/supabase-public-availability-repository";

const querySchema = z.object({
  serviceId: z.string().min(1).optional(),
  serviceIds: z.array(z.string().min(1)).optional(),
  professionalId: z.string().min(1).optional(),
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true })
});

export async function GET(
  request: Request,
  { params }: { params: { businessSlug: string } }
) {
  const url = new URL(request.url);
  const query = querySchema.safeParse({
    serviceId: url.searchParams.get("serviceId") ?? undefined,
    serviceIds: parseServiceIds(url.searchParams),
    professionalId: url.searchParams.get("professionalId") ?? undefined,
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to")
  });

  if (!query.success) {
    return NextResponse.json({ error: "Invalid availability query" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceClient();
    await expirePendingPaymentHolds(new SupabasePendingPaymentExpiryRepository(supabase), new Date(), 30);

    const response = await buildPublicAvailabilityResponse(
      new SupabasePublicAvailabilityRepository(supabase),
      {
        businessSlug: params.businessSlug,
        ...query.data
      }
    );

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof PublicAvailabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.code === "not_found" ? 404 : 400 });
    }

    throw error;
  }
}

function parseServiceIds(searchParams: URLSearchParams): string[] | undefined {
  const repeated = searchParams.getAll("serviceIds");
  const commaSeparated = searchParams.get("serviceIds")?.split(",") ?? [];
  const values = repeated.length > 1 ? repeated : commaSeparated;
  const ids = values.map((value) => value.trim()).filter(Boolean);
  return ids.length > 0 ? ids : undefined;
}
