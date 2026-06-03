import type { SupabaseClient } from "@supabase/supabase-js";
import type { PendingPaymentExpiryRepository } from "@/lib/booking/pending-payment-expiry-service";

export class SupabasePendingPaymentExpiryRepository implements PendingPaymentExpiryRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listExpiredPendingAppointments(input: { cutoff: string; limit: number }) {
    const { data, error } = await this.supabase
      .from("appointments")
      .select("id,business_id,created_at,payments(id,status)")
      .eq("status", "pending_payment")
      .lt("created_at", input.cutoff)
      .limit(input.limit);

    if (error) throw error;

    return (data ?? []).map((appointment) => ({
      id: String(appointment.id),
      payments: relationArray(appointment.payments).map((payment) => ({ status: String(payment.status) }))
    }));
  }

  async markAppointmentsExpired(input: { appointmentIds: string[]; now: string }) {
    const { error } = await this.supabase
      .from("appointments")
      .update({ status: "payment_expired", updated_at: input.now })
      .in("id", input.appointmentIds)
      .eq("status", "pending_payment");

    if (error) throw error;
  }

  async markPendingPaymentsExpired(input: { appointmentIds: string[]; now: string }) {
    const { error } = await this.supabase
      .from("payments")
      .update({ status: "expired", updated_at: input.now, raw_status: "auto_expired" })
      .in("appointment_id", input.appointmentIds)
      .eq("status", "pending");

    if (error) throw error;
  }
}

function relationArray(value: unknown): Array<Record<string, unknown>> {
  if (!value) return [];
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [value as Record<string, unknown>];
}
