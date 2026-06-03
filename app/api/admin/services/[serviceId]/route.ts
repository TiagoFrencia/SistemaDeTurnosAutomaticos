import { handleAdminServicePatch } from "@/lib/admin/admin-route-handlers";
import { SupabaseAdminAgendaRepository } from "@/lib/admin/supabase-admin-agenda-repository";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: { serviceId: string } }) {
  return handleAdminServicePatch(
    request,
    new SupabaseAdminAgendaRepository(createSupabaseServiceClient()),
    params
  );
}
