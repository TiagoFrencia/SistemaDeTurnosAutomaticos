import { handleAdminWhatsAppResetRequest } from "@/lib/admin/whatsapp-operations-service";
import { authorizeAdminRequest } from "@/lib/admin/admin-auth";
import { SupabaseAdminWhatsAppRepository } from "@/lib/admin/supabase-whatsapp-operations-repository";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const BUSINESS_SLUG = "achul-nails";

export async function POST(request: Request) {
  const auth = await authorizeAdminRequest(request, BUSINESS_SLUG);
  return handleAdminWhatsAppResetRequest({
    request,
    repository: new SupabaseAdminWhatsAppRepository(createSupabaseServiceClient()),
    adminApiKey: process.env.ADMIN_API_KEY,
    businessSlug: BUSINESS_SLUG,
    authorized: Boolean(auth)
  });
}
