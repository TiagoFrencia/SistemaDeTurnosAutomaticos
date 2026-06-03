import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { AdminTurnosFilters } from "@/components/admin/admin-turnos-filters";
import AdminTurnosList from "@/components/admin/admin-turnos-list";
import { ManualAppointmentForm } from "@/components/admin/manual-appointment-form";
import { requireAdminPageAccess } from "@/lib/admin/admin-auth";

type Props = {
  searchParams?: { [key: string]: string | undefined };
};

const PAGE_SIZE = 20;
const PILOT_BUSINESS_SLUG = "achul-nails";

export default async function Page({ searchParams }: Props) {
  await requireAdminPageAccess(PILOT_BUSINESS_SLUG);
  const supabase = createSupabaseServiceClient();
  const { date, status, professionalId, page, clientName } = searchParams || {};
  const today = todayDate();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", PILOT_BUSINESS_SLUG)
    .maybeSingle();
  const businessId = business?.id as string | undefined;

  const pageNumber = Math.max(1, Number(page || "1"));
  const from = (pageNumber - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let profQuery = supabase.from("professionals").select("id,name").eq("active", true);
  let serviceQuery = supabase
    .from("services")
    .select("id,name,duration_minutes,price_amount,deposit_type,deposit_value")
    .eq("active", true);
  if (businessId) {
    profQuery = profQuery.eq("business_id", businessId);
    serviceQuery = serviceQuery.eq("business_id", businessId);
  }

  const [{ data: professionalsData }, { data: servicesData }] = await Promise.all([profQuery, serviceQuery]);
  const professionals = Array.isArray(professionalsData) ? professionalsData : [];
  const services = Array.isArray(servicesData)
    ? servicesData.map((service) => ({
        id: service.id,
        name: service.name,
        durationMinutes: service.duration_minutes,
        priceAmount: service.price_amount,
        depositAmount:
          service.deposit_type === "percentage"
            ? Math.round((service.price_amount * service.deposit_value) / 100)
            : service.deposit_value
      }))
    : [];

  const relationSelect = clientName
    ? "id, start_at, end_at, status, total_amount, deposit_amount, remaining_amount, notes, customers!inner(full_name,phone,email), professionals(name), services!appointments_service_id_fkey1(name), appointment_services(position, services!appointment_services_service_id_fkey(name))"
    : "id, start_at, end_at, status, total_amount, deposit_amount, remaining_amount, notes, customers(full_name,phone,email), professionals(name), services!appointments_service_id_fkey1(name), appointment_services(position, services!appointment_services_service_id_fkey(name))";
  const legacyRelationSelect = clientName
    ? "id, start_at, end_at, status, total_amount, deposit_amount, remaining_amount, notes, customers!inner(full_name,phone,email), professionals(name), services!appointments_service_id_fkey1(name)"
    : "id, start_at, end_at, status, total_amount, deposit_amount, remaining_amount, notes, customers(full_name,phone,email), professionals(name), services!appointments_service_id_fkey1(name)";

  const queriedAppointments = await queryAppointments(relationSelect);
  const shouldRetryLegacy =
    queriedAppointments.error?.code === "PGRST200" || queriedAppointments.error?.code === "PGRST201";
  const { data: appointmentsData, error, count } = shouldRetryLegacy
    ? await queryAppointments(legacyRelationSelect)
    : queriedAppointments;
  const appointments = Array.isArray(appointmentsData) ? appointmentsData : [];

  if (error) console.error("Supabase error fetching appointments", error);

  const total = typeof count === "number" ? count : appointments.length;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="admin-panel admin-turnos-panel" aria-labelledby="turnos-title">
      <div className="admin-panel-heading">
        <div>
          <p className="admin-kicker">Turnos</p>
          <h1 id="turnos-title">Turnos confirmados</h1>
          <p className="admin-mobile-page-count">{total} resultados</p>
        </div>
      </div>

      <AdminTurnosFilters
        searchParams={searchParams || {}}
        professionals={professionals}
        total={total}
        pageNumber={pageNumber}
        lastPage={lastPage}
        today={today}
      />

      <AdminTurnosList appointments={appointments as never} />

      <div className="admin-manual-appointment-section">
        <ManualAppointmentForm businessSlug={PILOT_BUSINESS_SLUG} services={services} professionals={professionals} />
      </div>
    </section>
  );

  async function queryAppointments(select: string) {
    let base = supabase
      .from("appointments")
      .select(select, { count: "exact" })
      .order("start_at", { ascending: true });

    if (businessId) base = base.eq("business_id", businessId);
    if (status) base = base.eq("status", status);
    if (professionalId) base = base.eq("professional_id", professionalId);
    if (clientName) base = base.ilike("customers.full_name", `%${clientName}%`);
    if (date) {
      const start = new Date(`${date}T00:00:00-03:00`);
      const end = new Date(`${date}T23:59:59.999-03:00`);
      base = base.gte("start_at", start.toISOString()).lte("start_at", end.toISOString());
    }

    return base.range(from, to);
  }
}

function todayDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}
