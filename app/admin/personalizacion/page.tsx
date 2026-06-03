import { AdminBrandingPanel } from "@/components/admin/admin-branding-panel";
import { getAdminAgenda } from "@/lib/admin/admin-agenda-service";
import { requireAdminPageAccess } from "@/lib/admin/admin-auth";
import { SupabaseAdminAgendaRepository } from "@/lib/admin/supabase-admin-agenda-repository";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const businessSlug = "achul-nails";

export default async function AdminPersonalizacionPage() {
  await requireAdminPageAccess(businessSlug);
  const agenda = await getAdminAgenda(
    new SupabaseAdminAgendaRepository(createSupabaseServiceClient()),
    { businessSlug }
  );

  return (
    <div className="admin-stack">
      <AdminBrandingPanel businessSlug={businessSlug} branding={agenda.branding} />
    </div>
  );
}
