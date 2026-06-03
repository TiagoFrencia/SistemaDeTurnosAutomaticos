import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { requireAdminPageAccess } from "@/lib/admin/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const BUSINESS_SLUG = "achul-nails";

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  const access = await requireAdminPageAccess(BUSINESS_SLUG);
  const supabase = createSupabaseServiceClient();
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(now);
  const dayStart = new Date(`${today}T00:00:00-03:00`).toISOString();
  const dayEnd = new Date(`${today}T23:59:59.999-03:00`).toISOString();
  const monthStart = new Date(`${today.slice(0, 8)}01T00:00:00-03:00`).toISOString();

  const [todayResult, pendingResult, chatsResult, monthResult, nextAppointmentResult] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("business_id", access.businessId)
      .gte("start_at", dayStart)
      .lte("start_at", dayEnd),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("business_id", access.businessId)
      .eq("status", "pending_payment"),
    supabase
      .from("whatsapp_conversations")
      .select("id", { count: "exact", head: true })
      .eq("business_id", access.businessId)
      .not("state", "eq", "completed"),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("business_id", access.businessId)
      .gte("start_at", monthStart)
      .in("status", ["confirmed", "attended"]),
    supabase
      .from("appointments")
      .select("id,start_at,customers(full_name),professionals(name),services(name)")
      .eq("business_id", access.businessId)
      .gte("start_at", now.toISOString())
      .lte("start_at", dayEnd)
      .in("status", ["pending_payment", "confirmed"])
      .order("start_at", { ascending: true })
      .limit(1)
      .maybeSingle()
  ]);

  return (
    <section className="admin-panel" aria-labelledby="admin-home-title">
      <div className="admin-panel-heading">
        <div>
          <p className="admin-kicker">Inicio</p>
          <h1 id="admin-home-title">Panel de hoy</h1>
          <p className="muted">Un resumen rápido para operar Achul_Nails sin revisar todo el sistema.</p>
        </div>
      </div>

      <AdminDashboard
        metrics={[
          { href: "/admin/turnos", label: "Turnos de hoy", value: todayResult.count ?? 0, helper: "Agenda del día" },
          {
            href: "/admin/turnos?status=pending_payment",
            label: "Pendientes pago",
            value: pendingResult.count ?? 0,
            helper: "Se liberan si no pagan"
          },
          {
            href: "/admin/whatsapp",
            label: "Chats a revisar",
            value: chatsResult.count ?? 0,
            helper: "Clientas con ayuda"
          },
          {
            href: "/admin/turnos",
            label: "Total del mes",
            value: monthResult.count ?? 0,
            helper: "Turnos confirmados"
          }
        ]}
        nextAppointment={normalizeNextAppointment(nextAppointmentResult.data)}
        todayLabel={formatTodayLabel(now)}
      />
    </section>
  );
}

function normalizeNextAppointment(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const row = data as Record<string, unknown>;
  const customer = relationObject(row.customers) as Record<string, unknown> | null;
  const service = relationObject(row.services) as Record<string, unknown> | null;
  const professional = relationObject(row.professionals) as Record<string, unknown> | null;

  if (typeof row.start_at !== "string") {
    return null;
  }

  return {
    startAt: row.start_at,
    customerName: typeof customer?.full_name === "string" ? customer.full_name : "Clienta sin nombre",
    serviceName: typeof service?.name === "string" ? service.name : "Servicio",
    professionalName: typeof professional?.name === "string" ? professional.name : "Profesional"
  };
}

function formatTodayLabel(value: Date) {
  const formatted = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(value);

  return `Hoy · ${formatted}`;
}

function relationObject(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}
