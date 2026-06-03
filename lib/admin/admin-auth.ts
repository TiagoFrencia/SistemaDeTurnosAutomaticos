import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAuthServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { isAuthorizedAdminRequest } from "@/lib/admin/manual-appointment-service";

export type AdminAuthResult = {
  businessId: string;
  businessSlug: string;
  userId: string | null;
  source: "supabase" | "api_key";
};

export async function requireAdminPageAccess(businessSlug = "achul-nails"): Promise<AdminAuthResult> {
  const result = (await getAdminAccessForBusiness(businessSlug)) ?? (await getAdminApiKeyCookieAccess(businessSlug));
  if (!result) {
    redirect(`/admin/login?next=${encodeURIComponent(adminNextPath())}`);
  }

  return result;
}

export async function authorizeAdminRequest(
  request: Request,
  businessSlug = "achul-nails"
): Promise<AdminAuthResult | null> {
  const apiKeyFallbackAllowed = allowAdminApiKeyFallback();
  const bearerApiKeyAuthorized =
    apiKeyFallbackAllowed && isAuthorizedAdminBearerRequest(request, process.env.ADMIN_API_KEY);

  if (isUnsafeCrossOriginAdminMutation(request) && !bearerApiKeyAuthorized) {
    return null;
  }

  if (apiKeyFallbackAllowed && isAuthorizedAdminRequest(request, process.env.ADMIN_API_KEY)) {
    const business = await findBusinessBySlug(businessSlug);
    if (business) {
      return { businessId: business.id, businessSlug, userId: null, source: "api_key" };
    }
    if (process.env.NODE_ENV === "test") {
      return { businessId: "test-business", businessSlug, userId: null, source: "api_key" };
    }
  }

  return getAdminAccessForBusiness(businessSlug);
}

export async function requireAdminRequest(
  request: Request,
  businessSlug = "achul-nails"
): Promise<AdminAuthResult | Response> {
  const result = await authorizeAdminRequest(request, businessSlug);
  return result ?? NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export async function getAdminAccessForBusiness(businessSlug = "achul-nails"): Promise<AdminAuthResult | null> {
  let authClient: ReturnType<typeof createSupabaseAuthServerClient>;
  try {
    authClient = createSupabaseAuthServerClient();
  } catch {
    return null;
  }
  const {
    data: { user },
    error
  } = await authClient.auth.getUser();

  if (error || !user) {
    return null;
  }

  const supabase = createSupabaseServiceClient();
  const { data, error: adminError } = await supabase
    .from("business_admins")
    .select("businesses!inner(id,slug)")
    .eq("user_id", user.id)
    .eq("active", true)
    .eq("businesses.slug", businessSlug)
    .maybeSingle();

  if (adminError || !data) {
    return null;
  }

  const business = relationObject(data.businesses) as { id?: unknown; slug?: unknown } | null;
  if (typeof business?.id !== "string" || typeof business.slug !== "string") {
    return null;
  }

  return {
    businessId: business.id,
    businessSlug: business.slug,
    userId: user.id,
    source: "supabase"
  };
}

export function shouldShowAdminApiKeyFallback(): boolean {
  return allowAdminApiKeyFallback();
}

function allowAdminApiKeyFallback(): boolean {
  return process.env.ALLOW_ADMIN_API_KEY_FALLBACK === "true" || process.env.NODE_ENV === "test";
}

function isAuthorizedAdminBearerRequest(request: Request, adminApiKey?: string): boolean {
  if (!adminApiKey) {
    return false;
  }

  const auth = request.headers.get("authorization") ?? "";
  return auth.toLowerCase().startsWith("bearer ") && auth.slice(7) === adminApiKey;
}

function isUnsafeCrossOriginAdminMutation(request: Request): boolean {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase())) {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  const allowedOrigins = new Set<string>([new URL(request.url).origin]);
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      allowedOrigins.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin);
    } catch {
      // Ignore malformed env values and keep same-origin protection.
    }
  }

  return !allowedOrigins.has(origin);
}

async function findBusinessBySlug(slug: string): Promise<{ id: string } | null> {
  let data: { id?: unknown } | null = null;
  let error: unknown = null;
  try {
    const result = await createSupabaseServiceClient()
      .from("businesses")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    data = result.data;
    error = result.error;
  } catch {
    return null;
  }

  if (error || !data || typeof data.id !== "string") {
    return null;
  }

  return { id: data.id };
}

async function getAdminApiKeyCookieAccess(businessSlug: string): Promise<AdminAuthResult | null> {
  if (!allowAdminApiKeyFallback()) {
    return null;
  }

  if (!process.env.ADMIN_API_KEY || cookies().get("admin_api_key")?.value !== process.env.ADMIN_API_KEY) {
    return null;
  }

  const business = await findBusinessBySlug(businessSlug);
  if (business) {
    return { businessId: business.id, businessSlug, userId: null, source: "api_key" };
  }

  if (process.env.NODE_ENV === "test") {
    return { businessId: "test-business", businessSlug, userId: null, source: "api_key" };
  }

  return null;
}

function relationObject(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function adminNextPath(): string {
  return "/admin";
}
