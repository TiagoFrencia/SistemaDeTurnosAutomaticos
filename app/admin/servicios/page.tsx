import { AdminServicesPanel } from "@/components/admin/admin-services-panel";
import { getAdminAgenda } from "@/lib/admin/admin-agenda-service";
import { SupabaseAdminAgendaRepository } from "@/lib/admin/supabase-admin-agenda-repository";
import { requireAdminPageAccess } from "@/lib/admin/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const businessSlug = "achul-nails";

export default async function AdminServicesPage() {
  await requireAdminPageAccess(businessSlug);
  const agenda = await getAdminAgenda(
    new SupabaseAdminAgendaRepository(createSupabaseServiceClient()),
    { businessSlug }
  );

  return <AdminServicesPanel businessSlug={businessSlug} services={agenda.services} />;
}
