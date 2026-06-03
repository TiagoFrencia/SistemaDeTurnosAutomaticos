import { MercadoPagoConfig, Payment } from "mercadopago";
import type { PaymentOutcome } from "@/lib/domain/types";

export type MercadoPagoPaymentWebhookEvent = {
  appointmentId: string;
  providerPaymentId: string;
  outcome: PaymentOutcome;
  rawStatus?: string;
  rawStatusDetail?: string;
};

export class MercadoPagoPaymentReader {
  constructor(private readonly accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN_ACHUL) {}

  async readPayment(providerPaymentId: string): Promise<MercadoPagoPaymentWebhookEvent> {
    if (!this.accessToken) {
      throw new Error("Missing Mercado Pago access token MERCADOPAGO_ACCESS_TOKEN_ACHUL");
    }

    const client = new MercadoPagoConfig({ accessToken: this.accessToken });
    const payment = new Payment(client);
    const response = await payment.get({ id: providerPaymentId });

    if (!response.external_reference) {
      throw new Error(`Mercado Pago payment ${providerPaymentId} has no external_reference`);
    }

    return {
      appointmentId: response.external_reference,
      providerPaymentId: String(response.id ?? providerPaymentId),
      outcome: mapMercadoPagoStatus(response.status),
      rawStatus: response.status,
      rawStatusDetail: response.status_detail
    };
  }
}

function mapMercadoPagoStatus(status: string | undefined): PaymentOutcome {
  if (status === "approved") {
    return "approved";
  }

  if (status === "rejected") {
    return "rejected";
  }

  if (status === "cancelled") {
    return "cancelled";
  }

  if (status === "expired") {
    return "expired";
  }

  return "pending";
}
