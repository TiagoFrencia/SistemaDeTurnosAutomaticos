import type { NotificationChannel } from "@/lib/domain/types";
import type { NotificationService } from "@/lib/notifications/notification-service";

export type ReminderAppointment = {
  id: string;
  businessId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  serviceName: string;
  startAt: string;
};

export type AppointmentReminderRepository = {
  loadAppointmentsForReminderWindow(input: { from: string; to: string }): Promise<ReminderAppointment[]>;
  hasNotification(input: {
    appointmentId: string;
    channel: NotificationChannel;
    templateKey: "booking.reminder";
  }): Promise<boolean>;
};

export async function sendAppointmentReminders(
  repository: AppointmentReminderRepository,
  notifications: NotificationService,
  now = new Date()
): Promise<{ scanned: number; sent: number }> {
  const from = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();
  const appointments = await repository.loadAppointmentsForReminderWindow({ from, to });
  let sent = 0;

  for (const appointment of appointments) {
    const payload = {
      customerName: appointment.customerName,
      serviceName: appointment.serviceName,
      startAt: appointment.startAt
    };

    if (
      appointment.customerPhone &&
      notifications.hasAdapter("whatsapp") &&
      !(await repository.hasNotification({
        appointmentId: appointment.id,
        channel: "whatsapp",
        templateKey: "booking.reminder"
      }))
    ) {
      const result = await notifications.send({
        businessId: appointment.businessId,
        appointmentId: appointment.id,
        channel: "whatsapp",
        templateKey: "booking.reminder",
        recipient: appointment.customerPhone,
        payload
      });
      sent += 1;

      if (result.status !== "failed") {
        continue;
      }
    }

    if (
      appointment.customerEmail &&
      notifications.hasAdapter("email") &&
      !(await repository.hasNotification({
        appointmentId: appointment.id,
        channel: "email",
        templateKey: "booking.reminder"
      }))
    ) {
      await notifications.send({
        businessId: appointment.businessId,
        appointmentId: appointment.id,
        channel: "email",
        templateKey: "booking.reminder",
        recipient: appointment.customerEmail,
        payload
      });
      sent += 1;
    }
  }

  return { scanned: appointments.length, sent };
}
