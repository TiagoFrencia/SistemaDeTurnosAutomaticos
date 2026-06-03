import { createSupabaseServiceClient } from "@/lib/supabase/server";
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
    <section className="admin-panel" aria-labelledby="turnos-title">
      <div className="admin-panel-heading">
        <div>
          <p className="admin-kicker">Turnos</p>
          <h1 id="turnos-title">Turnos confirmados</h1>
        </div>
      </div>

      <form className="admin-form" method="get">
        <div className="admin-form-grid">
          <label>
            Fecha
            <input name="date" type="date" defaultValue={searchParams?.date} />
          </label>
          <label>
            Estado
            <select name="status" defaultValue={searchParams?.status ?? ""}>
              <option value="">Todos</option>
              <option value="confirmed">Confirmed</option>
              <option value="attended">Attended</option>
              <option value="no_show">No show</option>
            </select>
          </label>
          <label>
            Profesional
            <select name="professionalId" defaultValue={searchParams?.professionalId ?? ""}>
              <option value="">Todos</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cliente (nombre)
            <input name="clientName" defaultValue={searchParams?.clientName ?? ""} placeholder="Maria" />
          </label>
        </div>
        <div className="admin-filter-actions">
          <button className="admin-primary-button">Filtrar</button>

          <div className="admin-pagination-controls">
            <div>
              Resultados: <strong>{total}</strong>
            </div>
            <div>
              Pagina
              <select name="page" defaultValue={String(pageNumber)} style={{ marginLeft: 8 }}>
                {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={String(p)}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <a
              className="admin-link"
              href={`?${new URLSearchParams({ ...(searchParams || {}), page: String(Math.max(1, pageNumber - 1)) }).toString()}`}
            >
              Prev
            </a>
            <a
              className="admin-link"
              href={`?${new URLSearchParams({ ...(searchParams || {}), page: String(Math.min(lastPage, pageNumber + 1)) }).toString()}`}
            >
              Next
            </a>
          </div>
        </div>
      </form>

      <AdminTurnosList appointments={appointments as never} />

      <div style={{ marginTop: 16 }}>
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
