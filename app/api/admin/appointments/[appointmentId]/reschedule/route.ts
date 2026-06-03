import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin/admin-auth";
import { addMinutes } from "@/lib/datetime";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const BUSINESS_SLUG = "achul-nails";
const schema = z.object({
  startAt: z.string().datetime({ offset: true })
});

export async function PATCH(request: Request, { params }: { params: { appointmentId: string } }) {
  const auth = await authorizeAdminRequest(request, BUSINESS_SLUG);
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Fecha invalida" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const result = await rescheduleAppointment(supabase, {
    businessId: auth.businessId,
    appointmentId: params.appointmentId,
    startAt: parsed.data.startAt
  });

  if (result.status !== 200) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ appointment: result.appointment });
}

async function rescheduleAppointment(
  supabase: SupabaseClient,
  input: { businessId: string; appointmentId: string; startAt: string }
): Promise<
  | { status: 200; appointment: { id: string; start_at: string; end_at: string; status: string } }
  | { status: 400 | 404 | 409; error: string }
> {
  const { data: appointment, error: findError } = await supabase
    .from("appointments")
    .select("id,business_id,start_at,end_at,status")
    .eq("id", input.appointmentId)
    .eq("business_id", input.businessId)
    .maybeSingle();

  if (findError) throw findError;
  if (!appointment) {
    return { status: 404, error: "Turno no encontrado" };
  }
  if (!["pending_payment", "confirmed", "attended", "no_show"].includes(String(appointment.status))) {
    return { status: 400, error: "Este turno no se puede reprogramar" };
  }

  const durationMs = new Date(String(appointment.end_at)).getTime() - new Date(String(appointment.start_at)).getTime();
  const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
  const endAt = addMinutes(input.startAt, durationMinutes);

  const { data, error } = await supabase
    .from("appointments")
    .update({
      start_at: input.startAt,
      end_at: endAt,
      updated_at: new Date().toISOString()
    })
    .eq("id", input.appointmentId)
    .eq("business_id", input.businessId)
    .select("id,start_at,end_at,status")
    .maybeSingle();

  if (error && error.code === "23P01") {
    return { status: 409, error: "Ese horario ya esta ocupado" };
  }
  if (error) throw error;
  if (!data) {
    return { status: 404, error: "Turno no encontrado" };
  }

  return { status: 200, appointment: data };
}
