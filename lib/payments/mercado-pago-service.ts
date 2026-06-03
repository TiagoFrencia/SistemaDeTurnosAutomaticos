import { MercadoPagoConfig, Preference } from "mercadopago";
import { resolveMercadoPagoAccessToken } from "@/lib/payments/mercado-pago-credentials";
import type {
  CheckoutPreference,
  CreateCheckoutPreferenceInput,
  PaymentService
} from "@/lib/payments/payment-service";

export class MercadoPagoCheckoutService implements PaymentService {
  async createCheckoutPreference(input: CreateCheckoutPreferenceInput): Promise<CheckoutPreference> {
    const accessToken = resolveMercadoPagoAccessToken(input.credentialKey, process.env);
    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);
    const response = await preference.create({
      body: {
        external_reference: input.appointmentId,
        notification_url: input.webhookUrl,
        back_urls: {
          success: input.successUrl,
          failure: input.failureUrl,
          pending: input.failureUrl
        },
        items: [
          {
            id: input.appointmentId,
            title: `Sena ${input.serviceName}`,
            quantity: 1,
            currency_id: "ARS",
            unit_price: input.depositAmount
          }
        ],
        payer: {
          email: input.customerEmail
        },
        payment_methods: {
          excluded_payment_types: [{ id: "ticket" }]
        }
      }
    });

    if (!response.id || !response.init_point) {
      throw new Error("Mercado Pago did not return a checkout preference URL");
    }

    return {
      providerPreferenceId: response.id,
      checkoutUrl: response.init_point
    };
  }
}
