import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PaymentWebhookRepository,
  RecordWebhookPaymentInput,
  WebhookAppointment
} from "@/lib/booking/payment-webhook-service";

type DatabaseRow = Record<string, unknown>;

const FINAL_PAYMENT_STATUSES = new Set(["approved", "rejected", "cancelled", "expired", "refunded"]);

export class SupabasePaymentWebhookRepository implements PaymentWebhookRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async hasProcessedPayment(providerPaymentId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("payments")
      .select("status")
      .eq("provider_payment_id", providerPaymentId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? FINAL_PAYMENT_STATUSES.has(stringField(data, "status")) : false;
  }

  async loadAppointmentForWebhook(appointmentId: string): Promise<WebhookAppointment | null> {
    const { data, error } = await this.supabase
      .from("appointments")
      .select("id,business_id,start_at,customers(full_name,phone,email),services!appointments_service_id_fkey1(name)")
      .eq("id", appointmentId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }

    const customer = relationRow(data, "customers");
    const service = relationRow(data, "services");

    return {
      id: stringField(data, "id"),
      businessId: stringField(data, "business_id"),
      startAt: stringField(data, "start_at"),
      customerName: stringField(customer, "full_name"),
      customerEmail: nullableStringField(customer, "email"),
      customerPhone: nullableStringField(customer, "phone"),
      serviceName: stringField(service, "name")
    };
  }

  async recordWebhookPayment(input: RecordWebhookPaymentInput): Promise<void> {
    const { data: existingPayment, error: lookupError } = await this.supabase
      .from("payments")
      .select("id")
      .eq("appointment_id", input.appointmentId)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    const values = {
      provider_payment_id: input.providerPaymentId,
      status: input.status,
      raw_status: input.rawStatus ?? input.status,
      raw_status_detail: input.rawStatusDetail ?? null,
      webhook_received_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingPayment) {
      const { error } = await this.supabase
        .from("payments")
        .update(values)
        .eq("id", stringField(existingPayment, "id"));

      if (error) {
        throw error;
      }
      return;
    }

    const amount = await this.loadAppointmentDepositAmount(input.appointmentId);
    const { error } = await this.supabase.from("payments").insert({
      business_id: input.businessId,
      appointment_id: input.appointmentId,
      provider_payment_id: input.providerPaymentId,
      status: input.status,
      amount,
      currency: "ARS",
      raw_status: input.rawStatus ?? input.status,
      raw_status_detail: input.rawStatusDetail ?? null,
      webhook_received_at: new Date().toISOString()
    });

    if (error) {
      throw error;
    }
  }

  async updateAppointmentStatus(
    appointmentId: string,
    status: "pending_payment" | "confirmed" | "payment_failed" | "payment_expired"
  ): Promise<void> {
    const { error } = await this.supabase
      .from("appointments")
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", appointmentId);

    if (error) {
      throw error;
    }
  }

  private async loadAppointmentDepositAmount(appointmentId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("appointments")
      .select("deposit_amount")
      .eq("id", appointmentId)
      .single();

    if (error) {
      throw error;
    }

    return numberField(data, "deposit_amount");
  }
}

function relationRow(row: DatabaseRow, key: string): DatabaseRow {
  const value = row[key];
  const firstValue = Array.isArray(value) ? value[0] : value;
  if (!firstValue || typeof firstValue !== "object") {
    throw new Error(`Expected ${key} relation to be present`);
  }
  return firstValue as DatabaseRow;
}

function stringField(row: DatabaseRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected ${key} to be a string`);
  }
  return value;
}

function nullableStringField(row: DatabaseRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected ${key} to be a nullable string`);
  }
  return value;
}

function numberField(row: DatabaseRow, key: string): number {
  const value = row[key];
  if (typeof value !== "number") {
    throw new Error(`Expected ${key} to be a number`);
  }
  return value;
}
