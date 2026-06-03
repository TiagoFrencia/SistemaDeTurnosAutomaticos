import {
  handleAdminProfessionalsGet,
  handleAdminProfessionalsPost
} from "@/lib/admin/admin-route-handlers";
import { SupabaseAdminAgendaRepository } from "@/lib/admin/supabase-admin-agenda-repository";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  return handleAdminProfessionalsGet(
    request,
    new SupabaseAdminAgendaRepository(createSupabaseServiceClient())
  );
}

export async function POST(request: Request) {
  return handleAdminProfessionalsPost(
    request,
    new SupabaseAdminAgendaRepository(createSupabaseServiceClient())
  );
}
