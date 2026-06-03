import { NextResponse } from "next/server";
import { sendAppointmentReminders } from "@/lib/notifications/appointment-reminder-service";
import { buildNotificationService } from "@/lib/notifications/build-notification-service";
import { SupabaseAppointmentReminderRepository } from "@/lib/notifications/supabase-appointment-reminder-repository";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const result = await sendAppointmentReminders(
    new SupabaseAppointmentReminderRepository(supabase),
    buildNotificationService(supabase)
  );

  return NextResponse.json(result);
}

function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}
