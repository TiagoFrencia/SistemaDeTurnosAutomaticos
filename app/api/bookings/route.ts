import { NextResponse } from "next/server";
import { createPublicBooking, PublicBookingError } from "@/lib/booking/public-booking-service";
import { SupabasePublicBookingRepository } from "@/lib/booking/supabase-public-booking-repository";
import { MercadoPagoCheckoutService } from "@/lib/payments/mercado-pago-service";
import type { PaymentService } from "@/lib/payments/payment-service";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { bookingRequestSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bookingRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de reserva invalidos" }, { status: 400 });
  }

  try {
    const result = await createPublicBooking(
      new SupabasePublicBookingRepository(createSupabaseServiceClient()),
      paymentServiceForEnvironment(),
      parsed.data
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof PublicBookingError) {
      return NextResponse.json(
        { error: error.message },
        {
          status:
            error.code === "conflict"
              ? 409
              : error.code === "not_found"
                ? 404
                : error.code === "payment_configuration"
                  ? 503
                  : 400
        }
      );
    }

    if (error instanceof Error && error.message.includes("Missing Mercado Pago access token")) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    throw error;
  }
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
