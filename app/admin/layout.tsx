import type { ReactNode } from "react";
import { getAdminAgenda, type AdminBusinessBranding } from "@/lib/admin/admin-agenda-service";
import { brandingThemeStyle } from "@/lib/branding/theme";
import { SupabaseAdminAgendaRepository } from "@/lib/admin/supabase-admin-agenda-repository";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

const businessSlug = "achul-nails";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const agenda = await getAdminAgenda(
    new SupabaseAdminAgendaRepository(createSupabaseServiceClient()),
    { businessSlug }
  );

  return (
    <main className="admin-shell" style={themeStyle(agenda.branding)}>
      <AdminSidebar logoUrl={agenda.branding.logoUrl} />
      <div className="admin-content">{children}</div>
    </main>
  );
}

function themeStyle(branding: AdminBusinessBranding) {
  return brandingThemeStyle(branding);
}
