import type { SupabaseClient } from "@supabase/supabase-js";
import {
  handleManualAppointmentRequest,
  type ManualAppointmentRepository
} from "@/lib/admin/manual-appointment-service";
import { authorizeAdminRequest } from "@/lib/admin/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const PILOT_BUSINESS_SLUG = "achul-nails";

export async function POST(request: Request) {
  const supabase = createSupabaseServiceClient();
  const auth = await authorizeAdminRequest(request, PILOT_BUSINESS_SLUG);
  return handleManualAppointmentRequest({
    request,
    repository: new SupabaseManualAppointmentRepository(supabase),
    adminApiKey: process.env.ADMIN_API_KEY,
    authorized: Boolean(auth)
  });
}

class SupabaseManualAppointmentRepository implements ManualAppointmentRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findBusinessBySlug(slug: string) {
    const { data, error } = await this.supabase.from("businesses").select("id,slug").eq("slug", slug).maybeSingle();
    if (error) throw error;
    return data;
  }

  async findActiveService(input: { businessId: string; serviceId: string }) {
    const { data, error } = await this.supabase
      .from("services")
      .select("id,business_id,duration_minutes,price_amount,deposit_type,deposit_value,active")
      .eq("id", input.serviceId)
      .eq("business_id", input.businessId)
      .eq("active", true)
      .maybeSingle();
    if (error) throw error;
    return data
      ? {
          id: data.id,
          businessId: data.business_id,
          durationMinutes: data.duration_minutes,
          priceAmount: data.price_amount,
          depositType: data.deposit_type,
          depositValue: data.deposit_value,
          active: data.active
        }
      : null;
  }

  async findActiveProfessional(input: { businessId: string; professionalId: string }) {
    const { data, error } = await this.supabase
      .from("professionals")
      .select("id,business_id,active")
      .eq("id", input.professionalId)
      .eq("business_id", input.businessId)
      .eq("active", true)
      .maybeSingle();
    if (error) throw error;
    return data ? { id: data.id, businessId: data.business_id, active: data.active } : null;
  }

  async upsertCustomer(input: { businessId: string; fullName: string; phone: string; email: string | null }) {
    const { data: existing, error: findError } = await this.supabase
      .from("customers")
      .select("id")
      .eq("business_id", input.businessId)
      .eq("phone", input.phone)
      .maybeSingle();
    if (findError) throw findError;

    if (existing) {
      const { error } = await this.supabase
        .from("customers")
        .update({ full_name: input.fullName, email: input.email, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
      return { id: existing.id };
    }

    const { data, error } = await this.supabase
      .from("customers")
      .insert({
        business_id: input.businessId,
        full_name: input.fullName,
        phone: input.phone,
        email: input.email
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: data.id };
  }

  async createAppointment(input: Parameters<ManualAppointmentRepository["createAppointment"]>[0]) {
    const { data, error } = await this.supabase
      .from("appointments")
      .insert({
        business_id: input.businessId,
        professional_id: input.professionalId,
        service_id: input.serviceId,
        customer_id: input.customerId,
        start_at: input.startAt,
        end_at: input.endAt,
        status: input.status,
        source: input.source,
        deposit_required: input.depositRequired,
        total_amount: input.totalAmount,
        deposit_amount: input.depositAmount,
        remaining_amount: input.remainingAmount,
        notes: input.notes,
        created_at: new Date().toISOString()
      })
      .select(
        "id,business_id,professional_id,service_id,customer_id,start_at,end_at,status,source,deposit_required,total_amount,deposit_amount,remaining_amount,notes"
      )
      .single();
    if (error) throw error;

    return {
      id: data.id,
      businessId: data.business_id,
      professionalId: data.professional_id,
      serviceId: data.service_id,
      customerId: data.customer_id,
      startAt: data.start_at,
      endAt: data.end_at,
      status: data.status,
      source: data.source,
      depositRequired: data.deposit_required,
      totalAmount: data.total_amount,
      depositAmount: data.deposit_amount,
      remainingAmount: data.remaining_amount,
      notes: data.notes
    };
  }

  async createCashPayment(input: Parameters<ManualAppointmentRepository["createCashPayment"]>[0]) {
    const { error } = await this.supabase.from("payments").insert({
      business_id: input.businessId,
      appointment_id: input.appointmentId,
      provider: input.provider,
      provider_preference_id: null,
      provider_payment_id: null,
      status: input.status,
      amount: input.amount,
      currency: input.currency,
      created_at: new Date().toISOString()
    });
    if (error) throw error;
  }

  async recordAppointmentServices(input: Parameters<NonNullable<ManualAppointmentRepository["recordAppointmentServices"]>>[0]) {
    const { error } = await this.supabase.from("appointment_services").insert(
      input.services.map((service) => ({
        appointment_id: input.appointmentId,
        service_id: service.serviceId,
        position: service.position,
        price_amount: service.priceAmount,
        deposit_amount: service.depositAmount,
        duration_minutes: service.durationMinutes
      }))
    );

    if (error && error.code !== "42P01" && error.code !== "PGRST205") {
      throw error;
    }
  }
}
