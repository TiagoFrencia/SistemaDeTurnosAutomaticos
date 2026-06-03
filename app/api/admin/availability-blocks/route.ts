import {
  handleAdminAvailabilityBlocksGet,
  handleAdminAvailabilityBlocksPost
} from "@/lib/admin/admin-route-handlers";
import { SupabaseAdminAgendaRepository } from "@/lib/admin/supabase-admin-agenda-repository";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  return handleAdminAvailabilityBlocksGet(
    request,
    new SupabaseAdminAgendaRepository(createSupabaseServiceClient())
  );
}

export async function POST(request: Request) {
  return handleAdminAvailabilityBlocksPost(
    request,
    new SupabaseAdminAgendaRepository(createSupabaseServiceClient())
  );
}
