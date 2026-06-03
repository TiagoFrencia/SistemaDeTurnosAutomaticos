import { z } from "zod";
import { isAuthorizedAdminRequest } from "@/lib/admin/manual-appointment-service";

const allowedStatuses = ["attended", "no_show", "cancelled"] as const;
const updateStatusSchema = z.object({
  status: z.enum(allowedStatuses)
});

type AllowedAppointmentStatus = (typeof allowedStatuses)[number];
type ExistingAppointmentStatus =
  | "pending_payment"
  | "confirmed"
  | "payment_failed"
  | "payment_expired"
  | "cancelled"
  | "attended"
  | "no_show"
  | string;

export type AppointmentStatusRepository = {
  findBusinessBySlug(slug: string): Promise<{ id: string; slug: string } | null>;
  findAppointment(input: {
    businessId: string;
    appointmentId: string;
  }): Promise<{ id: string; businessId: string; status: ExistingAppointmentStatus } | null>;
  updateStatus(input: {
    businessId: string;
    appointmentId: string;
    status: AllowedAppointmentStatus;
  }): Promise<{ id: string; businessId: string; status: string; updatedAt?: string | null } | null>;
};

export class AppointmentStatusError extends Error {
  constructor(
    readonly code: "invalid_request" | "not_found" | "invalid_transition",
    message: string
  ) {
    super(message);
  }
}

export async function handleAppointmentStatusRequest(input: {
  request: Request;
  appointmentId: string;
  businessSlug: string;
  repository: AppointmentStatusRepository;
  adminApiKey?: string;
  authorized?: boolean;
}): Promise<Response> {
  if (!input.authorized && !isAuthorizedAdminRequest(input.request, input.adminApiKey)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const body = await input.request.json().catch(() => null);
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Estado de turno invalido" }, 400);
  }

  try {
    const appointment = await updateAppointmentStatus(input.repository, {
      appointmentId: input.appointmentId,
      businessSlug: input.businessSlug,
      status: parsed.data.status
    });

    return json({ appointment }, 200);
  } catch (error) {
    if (error instanceof AppointmentStatusError) {
      const status = error.code === "not_found" ? 404 : 400;
      return json({ error: error.message }, status);
    }

    throw error;
  }
}

export async function updateAppointmentStatus(
  repository: AppointmentStatusRepository,
  input: {
    appointmentId: string;
    businessSlug: string;
    status: AllowedAppointmentStatus;
  }
) {
  const business = await repository.findBusinessBySlug(input.businessSlug);
  if (!business) {
    throw new AppointmentStatusError("not_found", "Business not found");
  }

  const appointment = await repository.findAppointment({
    businessId: business.id,
    appointmentId: input.appointmentId
  });
  if (!appointment) {
    throw new AppointmentStatusError("not_found", "Appointment not found");
  }

  if (!["confirmed", "attended", "no_show"].includes(appointment.status)) {
    throw new AppointmentStatusError("invalid_transition", "El turno no permite cambiar asistencia");
  }

  const updated = await repository.updateStatus({
    businessId: business.id,
    appointmentId: input.appointmentId,
    status: input.status
  });
  if (!updated) {
    throw new AppointmentStatusError("not_found", "Appointment not found");
  }

  return updated;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
