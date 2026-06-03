import { Resend } from "resend";
import { EmailNotificationAdapter } from "@/lib/notifications/email-adapter";
import {
  NotificationService,
  SupabaseNotificationLog,
  type NotificationAdapter
} from "@/lib/notifications/notification-service";
import { whatsappAdapterFromEnvironment } from "@/lib/notifications/whatsapp-adapter";
import type { createSupabaseServiceClient } from "@/lib/supabase/server";

export function buildNotificationService(
  supabase: ReturnType<typeof createSupabaseServiceClient>
): NotificationService {
  const adapters: NotificationAdapter[] = [];
  const whatsappAdapter = whatsappAdapterFromEnvironment();
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (whatsappAdapter) {
    adapters.push(whatsappAdapter);
  }

  if (resendApiKey && fromEmail) {
    adapters.push(new EmailNotificationAdapter(new Resend(resendApiKey), fromEmail));
  }

  return new NotificationService(adapters, new SupabaseNotificationLog(supabase));
}
