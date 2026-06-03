import type { SupabaseClient } from "@supabase/supabase-js";
import {
  handleAppointmentStatusRequest,
  type AppointmentStatusRepository
} from "@/lib/admin/appointment-status-service";
import { authorizeAdminRequest } from "@/lib/admin/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const PILOT_BUSINESS_SLUG = "achul-nails";

export async function PATCH(request: Request, { params }: { params: { appointmentId: string } }) {
  const supabase = createSupabaseServiceClient();
  const auth = await authorizeAdminRequest(request, PILOT_BUSINESS_SLUG);
  return handleAppointmentStatusRequest({
    request,
    appointmentId: params.appointmentId,
    businessSlug: PILOT_BUSINESS_SLUG,
    repository: new SupabaseAppointmentStatusRepository(supabase),
    adminApiKey: process.env.ADMIN_API_KEY,
    authorized: Boolean(auth)
  });
}

class SupabaseAppointmentStatusRepository implements AppointmentStatusRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findBusinessBySlug(slug: string) {
    const { data, error } = await this.supabase.from("businesses").select("id,slug").eq("slug", slug).maybeSingle();
    if (error) throw error;
    return data;
  }

  async findAppointment(input: { businessId: string; appointmentId: string }) {
    const { data, error } = await this.supabase
      .from("appointments")
      .select("id,business_id,status")
      .eq("id", input.appointmentId)
      .eq("business_id", input.businessId)
      .maybeSingle();
    if (error) throw error;
    return data ? { id: data.id, businessId: data.business_id, status: data.status } : null;
  }

  async updateStatus(input: { businessId: string; appointmentId: string; status: "attended" | "no_show" | "cancelled" }) {
    const { data, error } = await this.supabase
      .from("appointments")
      .update({
        status: input.status,
        updated_at: new Date().toISOString()
      })
      .eq("id", input.appointmentId)
      .eq("business_id", input.businessId)
      .select("id,business_id,status,updated_at")
      .maybeSingle();
    if (error) throw error;
    return data ? { id: data.id, businessId: data.business_id, status: data.status, updatedAt: data.updated_at } : null;
  }
}
