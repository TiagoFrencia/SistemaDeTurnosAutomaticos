import { afterEach, describe, expect, it, vi } from "vitest";
import { MercadoPagoCheckoutService } from "@/lib/payments/mercado-pago-service";

const createPreference = vi.fn();

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(function MercadoPagoConfig(input: unknown) {
    return input;
  }),
  Preference: vi.fn(function Preference() {
    return { create: createPreference };
  })
}));

describe("MercadoPagoCheckoutService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.MERCADOPAGO_ACCESS_TOKEN_ACHUL;
  });

  it("excludes offline ticket payments without excluding account money or bank transfer", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN_ACHUL = "test-token";
    createPreference.mockResolvedValue({ id: "pref-1", init_point: "https://checkout.example" });

    const result = await new MercadoPagoCheckoutService().createCheckoutPreference({
      businessId: "business-1",
      appointmentId: "appointment-1",
      credentialKey: "ACHUL",
      serviceName: "Manicure",
      depositAmount: 1500,
      customerEmail: "ana@example.com",
      webhookUrl: "https://app.example/api/mercado-pago/webhook",
      successUrl: "https://app.example/achul-nails?payment=success",
      failureUrl: "https://app.example/achul-nails?payment=failure"
    });

    expect(result).toEqual({
      providerPreferenceId: "pref-1",
      checkoutUrl: "https://checkout.example"
    });
    expect(createPreference).toHaveBeenCalledWith({
      body: expect.objectContaining({
        payment_methods: {
          excluded_payment_types: [{ id: "ticket" }]
        }
      })
    });
    expect(JSON.stringify(createPreference.mock.calls[0][0].body.payment_methods)).not.toContain("account_money");
    expect(JSON.stringify(createPreference.mock.calls[0][0].body.payment_methods)).not.toContain("bank_transfer");
  });
});
