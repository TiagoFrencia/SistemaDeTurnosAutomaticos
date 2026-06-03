import { handleAdminProfessionalPatch } from "@/lib/admin/admin-route-handlers";
import { SupabaseAdminAgendaRepository } from "@/lib/admin/supabase-admin-agenda-repository";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: { professionalId: string } }
) {
  return handleAdminProfessionalPatch(
    request,
    new SupabaseAdminAgendaRepository(createSupabaseServiceClient()),
    params
  );
}
