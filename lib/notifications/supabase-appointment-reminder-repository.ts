import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationChannel } from "@/lib/domain/types";
import type {
  AppointmentReminderRepository,
  ReminderAppointment
} from "@/lib/notifications/appointment-reminder-service";

type DatabaseRow = Record<string, unknown>;

export class SupabaseAppointmentReminderRepository implements AppointmentReminderRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async loadAppointmentsForReminderWindow(input: { from: string; to: string }): Promise<ReminderAppointment[]> {
    const { data, error } = await this.supabase
      .from("appointments")
      .select("id,business_id,start_at,customers(full_name,phone,email),services!appointments_service_id_fkey1(name)")
      .eq("status", "confirmed")
      .gte("start_at", input.from)
      .lt("start_at", input.to)
      .order("start_at", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map((appointment) => {
      const customer = relationRow(appointment, "customers");
      const service = relationRow(appointment, "services");

      return {
        id: stringField(appointment, "id"),
        businessId: stringField(appointment, "business_id"),
        startAt: stringField(appointment, "start_at"),
        customerName: stringField(customer, "full_name"),
        customerPhone: nullableStringField(customer, "phone"),
        customerEmail: nullableStringField(customer, "email"),
        serviceName: stringField(service, "name")
      };
    });
  }

  async hasNotification(input: {
    appointmentId: string;
    channel: NotificationChannel;
    templateKey: "booking.reminder";
  }): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("notifications")
      .select("id")
      .eq("appointment_id", input.appointmentId)
      .eq("channel", input.channel)
      .eq("template_key", input.templateKey)
      .limit(1);

    if (error) {
      throw error;
    }

    return Boolean(data?.length);
  }
}

function relationRow(row: DatabaseRow, key: string): DatabaseRow {
  const value = row[key];
  const firstValue = Array.isArray(value) ? value[0] : value;
  if (!firstValue || typeof firstValue !== "object") {
    throw new Error(`Expected ${key} relation to be present`);
  }
  return firstValue as DatabaseRow;
}

function stringField(row: DatabaseRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected ${key} to be a string`);
  }
  return value;
}

function nullableStringField(row: DatabaseRow, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected ${key} to be a nullable string`);
  }
  return value;
}
