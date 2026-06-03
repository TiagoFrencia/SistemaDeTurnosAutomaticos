import { NextResponse } from "next/server";
import {
  AdminAgendaError,
  createAdminAvailabilityBlock,
  createAdminProfessional,
  createAdminService,
  getAdminAgenda,
  replaceAdminBusinessHours,
  updateAdminBranding,
  updateAdminProfessional,
  updateAdminService,
  type AdminAgendaRepository
} from "@/lib/admin/admin-agenda-service";
import { requireAdminRequest } from "@/lib/admin/admin-auth";
import {
  adminAvailabilityBlockSchema,
  adminBrandingSchema,
  adminBusinessHoursReplaceSchema,
  adminProfessionalPatchSchema,
  adminProfessionalSchema,
  adminServicePatchSchema,
  adminServiceSchema
} from "@/lib/validation/schemas";

export async function handleAdminServicesGet(
  request: Request,
  repository: AdminAgendaRepository
): Promise<Response> {
  const unauthorized = await unauthorizedAdminResponse(request);
  if (unauthorized) return unauthorized;
  return handleAdminGet(request, repository, "services");
}

export async function handleAdminServicesPost(
  request: Request,
  repository: AdminAgendaRepository
): Promise<Response> {
  const unauthorized = await unauthorizedAdminResponse(request);
  if (unauthorized) return unauthorized;
  const body = await readJson(request);
  const parsed = adminServiceSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Datos de servicio invalidos", 400);
  }

  try {
    const service = await createAdminService(repository, {
      businessSlug: businessSlugFrom(request),
      ...parsed.data
    });
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function handleAdminServicePatch(
  request: Request,
  repository: AdminAgendaRepository,
  params: { serviceId: string }
): Promise<Response> {
  const unauthorized = await unauthorizedAdminResponse(request);
  if (unauthorized) return unauthorized;
  const body = await readJson(request);
  const parsed = adminServicePatchSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Datos de servicio invalidos", 400);
  }

  try {
    const service = await updateAdminService(repository, {
      businessSlug: businessSlugFrom(request),
      serviceId: params.serviceId,
      patch: parsed.data
    });
    return NextResponse.json(service);
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function handleAdminProfessionalsGet(
  request: Request,
  repository: AdminAgendaRepository
): Promise<Response> {
  const unauthorized = await unauthorizedAdminResponse(request);
  if (unauthorized) return unauthorized;
  return handleAdminGet(request, repository, "professionals");
}

export async function handleAdminProfessionalsPost(
  request: Request,
  repository: AdminAgendaRepository
): Promise<Response> {
  const unauthorized = await unauthorizedAdminResponse(request);
  if (unauthorized) return unauthorized;
  const body = await readJson(request);
  const parsed = adminProfessionalSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Datos de profesional invalidos", 400);
  }

  try {
    const professional = await createAdminProfessional(repository, {
      businessSlug: businessSlugFrom(request),
      ...parsed.data
    });
    return NextResponse.json(professional, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function handleAdminProfessionalPatch(
  request: Request,
  repository: AdminAgendaRepository,
  params: { professionalId: string }
): Promise<Response> {
  const unauthorized = await unauthorizedAdminResponse(request);
  if (unauthorized) return unauthorized;
  const body = await readJson(request);
  const parsed = adminProfessionalPatchSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Datos de profesional invalidos", 400);
  }

  try {
    const professional = await updateAdminProfessional(repository, {
      businessSlug: businessSlugFrom(request),
      professionalId: params.professionalId,
      patch: parsed.data
    });
    return NextResponse.json(professional);
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function handleAdminBusinessHoursGet(
  request: Request,
  repository: AdminAgendaRepository
): Promise<Response> {
  const unauthorized = await unauthorizedAdminResponse(request);
  if (unauthorized) return unauthorized;
  return handleAdminGet(request, repository, "businessHours");
}

export async function handleAdminBusinessHoursPost(
  request: Request,
  repository: AdminAgendaRepository
): Promise<Response> {
  const unauthorized = await unauthorizedAdminResponse(request);
  if (unauthorized) return unauthorized;
  const body = await readJson(request);
  const parsed = adminBusinessHoursReplaceSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Datos de horarios invalidos", 400);
  }

  try {
    const hours = await replaceAdminBusinessHours(repository, {
      businessSlug: businessSlugFrom(request),
      ...parsed.data
    });
    return NextResponse.json(hours, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function handleAdminAvailabilityBlocksGet(
  request: Request,
  repository: AdminAgendaRepository
): Promise<Response> {
  const unauthorized = await unauthorizedAdminResponse(request);
  if (unauthorized) return unauthorized;
  return handleAdminGet(request, repository, "availabilityBlocks");
}

export async function handleAdminAvailabilityBlocksPost(
  request: Request,
  repository: AdminAgendaRepository
): Promise<Response> {
  const unauthorized = await unauthorizedAdminResponse(request);
  if (unauthorized) return unauthorized;
  const body = await readJson(request);
  const parsed = adminAvailabilityBlockSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Datos de bloqueo invalidos", 400);
  }

  try {
    const block = await createAdminAvailabilityBlock(repository, {
      businessSlug: businessSlugFrom(request),
      ...parsed.data
    });
    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function handleAdminBrandingGet(
  request: Request,
  repository: AdminAgendaRepository
): Promise<Response> {
  const unauthorized = await unauthorizedAdminResponse(request);
  if (unauthorized) return unauthorized;
  try {
    const agenda = await getAdminAgenda(repository, { businessSlug: businessSlugFrom(request) });
    return NextResponse.json(agenda.branding);
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function handleAdminBrandingPost(
  request: Request,
  repository: AdminAgendaRepository
): Promise<Response> {
  const unauthorized = await unauthorizedAdminResponse(request);
  if (unauthorized) return unauthorized;
  const body = await readJson(request);
  const parsed = adminBrandingSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Datos de personalizacion invalidos", 400);
  }

  try {
    const branding = await updateAdminBranding(repository, {
      businessSlug: businessSlugFrom(request),
      ...parsed.data
    });
    return NextResponse.json(branding);
  } catch (error) {
    return adminErrorResponse(error);
  }
}

async function handleAdminGet(
  request: Request,
  repository: AdminAgendaRepository,
  key: "services" | "professionals" | "businessHours" | "availabilityBlocks"
): Promise<Response> {
  try {
    const agenda = await getAdminAgenda(repository, { businessSlug: businessSlugFrom(request) });
    return NextResponse.json(agenda[key]);
  } catch (error) {
    return adminErrorResponse(error);
  }
}

function businessSlugFrom(request: Request): string {
  return new URL(request.url).searchParams.get("businessSlug") || "achul-nails";
}

async function unauthorizedAdminResponse(request: Request): Promise<Response | null> {
  const auth = await requireAdminRequest(request, businessSlugFrom(request));
  return auth instanceof Response ? auth : null;
}

async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}

function adminErrorResponse(error: unknown): Response {
  if (error instanceof AdminAgendaError) {
    return errorResponse(error.message, error.code === "not_found" ? 404 : 400);
  }

  throw error;
}

function errorResponse(error: string, status: number): Response {
  return NextResponse.json({ error }, { status });
}
