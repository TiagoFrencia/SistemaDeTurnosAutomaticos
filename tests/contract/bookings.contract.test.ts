import { afterEach, describe, expect, it } from "vitest";
import {
  createPublicBooking,
  PublicBookingError,
  type BookingContext,
  type PublicBookingRepository
} from "@/lib/booking/public-booking-service";
import type { CreateCheckoutPreferenceInput, PaymentService } from "@/lib/payments/payment-service";

const context: BookingContext = {
  business: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Achul_Nails",
    slug: "achul-nails",
    active: true,
    mercadoPagoCredentialKey: "ACHUL"
  },
  services: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Manicure semipermanente",
      durationMinutes: 60,
      priceAmount: 5000,
      depositAmount: 1500,
      active: true
    }
  ],
  professional: {
    id: "33333333-3333-4333-8333-333333333333",
    active: true
  }
};

function bookingInput() {
  return {
    businessSlug: "achul-nails",
    serviceId: context.services[0].id,
    professionalId: context.professional.id,
    startAt: "2026-06-01T09:00:00-03:00",
    customer: {
      fullName: "Ana Perez",
      phone: "+5491111111111",
      email: "ana@example.com"
    }
  };
}

function repository(overrides: Partial<PublicBookingRepository> = {}): PublicBookingRepository {
  return {
    loadContext: async () => context,
    upsertCustomer: async () => ({ id: "44444444-4444-4444-8444-444444444444" }),
    createPendingHold: async (input) => ({
      appointmentId: "55555555-5555-4555-8555-555555555555",
      startAt: input.startAt,
      endAt: input.endAt,
      status: "pending_payment"
    }),
    recordPendingPayment: async () => undefined,
    ...overrides
  };
}

function paymentService(capture?: (input: CreateCheckoutPreferenceInput) => void): PaymentService {
  return {
    createCheckoutPreference: async (input) => {
      capture?.(input);
      return {
        providerPreferenceId: "pref-1",
        checkoutUrl: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-1"
      };
    }
  };
}

describe("POST /api/bookings contract", () => {
  afterEach(() => {
    delete process.env.NGROK_PUBLIC_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("creates a pending hold and returns a Mercado Pago checkout URL", async () => {
    const result = await createPublicBooking(repository(), paymentService(), bookingInput());

    expect(result).toMatchObject({
      appointmentId: "55555555-5555-4555-8555-555555555555",
      providerPreferenceId: "pref-1",
      checkoutUrl: expect.stringContaining("mercadopago"),
      status: "pending_payment",
      startAt: "2026-06-01T09:00:00-03:00",
      endAt: "2026-06-01T10:00:00.000-03:00"
    });
  });

  it("uses NGROK_PUBLIC_URL for the webhook notification URL when configured", async () => {
    process.env.NGROK_PUBLIC_URL = "https://demo-achul.ngrok-free.app";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    let preferenceInput: CreateCheckoutPreferenceInput | undefined;

    await createPublicBooking(
      repository(),
      paymentService((input) => {
        preferenceInput = input;
      }),
      bookingInput()
    );

    expect(preferenceInput?.webhookUrl).toBe(
      "https://demo-achul.ngrok-free.app/api/mercado-pago/webhook"
    );
    expect(preferenceInput?.depositAmount).toBe(1500);
    expect(preferenceInput?.credentialKey).toBe("ACHUL");
  });

  it("creates one hold for multiple services and charges the combined deposit", async () => {
    let holdInput: Parameters<PublicBookingRepository["createPendingHold"]>[0] | undefined;
    let preferenceInput: CreateCheckoutPreferenceInput | undefined;

    await createPublicBooking(
      repository({
        loadContext: async () => ({
          ...context,
          services: [
            context.services[0],
            {
              id: "22222222-2222-4222-8222-222222222223",
              name: "Kapping gel",
              durationMinutes: 90,
              priceAmount: 8000,
              depositAmount: 2500,
              active: true
            }
          ]
        }),
        createPendingHold: async (input) => {
          holdInput = input;
          return {
            appointmentId: "55555555-5555-4555-8555-555555555555",
            startAt: input.startAt,
            endAt: input.endAt,
            status: "pending_payment"
          };
        }
      }),
      paymentService((input) => {
        preferenceInput = input;
      }),
      {
        ...bookingInput(),
        serviceIds: [
          "22222222-2222-4222-8222-222222222222",
          "22222222-2222-4222-8222-222222222223"
        ]
      }
    );

    expect(holdInput).toMatchObject({
      serviceId: "22222222-2222-4222-8222-222222222222",
      endAt: "2026-06-01T11:30:00.000-03:00",
      totalAmount: 13000,
      depositAmount: 4000,
      services: [
        {
          serviceId: "22222222-2222-4222-8222-222222222222",
          position: 1,
          priceAmount: 5000,
          depositAmount: 1500,
          durationMinutes: 60
        },
        {
          serviceId: "22222222-2222-4222-8222-222222222223",
          position: 2,
          priceAmount: 8000,
          depositAmount: 2500,
          durationMinutes: 90
        }
      ]
    });
    expect(preferenceInput).toMatchObject({
      serviceName: "Manicure semipermanente + 1 servicio",
      depositAmount: 4000
    });
  });

  it("fails clearly when the business has no Mercado Pago credential key", async () => {
    await expect(
      createPublicBooking(
        repository({
          loadContext: async () => ({
            ...context,
            business: { ...context.business, mercadoPagoCredentialKey: null }
          })
        }),
        paymentService(),
        bookingInput()
      )
    ).rejects.toMatchObject({ code: "payment_configuration" });
  });

  it("surfaces a conflict when the hold creation rejects an occupied slot", async () => {
    await expect(
      createPublicBooking(
        repository({
          createPendingHold: async () => {
            throw new PublicBookingError(
              "conflict",
              "Ese horario acaba de ser reservado por otra persona."
            );
          }
        }),
        paymentService(),
        bookingInput()
      )
    ).rejects.toMatchObject({ code: "conflict" });
  });
});
