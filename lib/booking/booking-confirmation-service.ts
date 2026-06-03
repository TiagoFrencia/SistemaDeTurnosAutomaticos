import type { WebhookAppointment } from "@/lib/booking/payment-webhook-service";
import type { NotificationService } from "@/lib/notifications/notification-service";

export async function sendBookingConfirmedNotification(
  notifications: NotificationService,
  appointment: WebhookAppointment
): Promise<void> {
  const payload = {
    customerName: appointment.customerName,
    serviceName: appointment.serviceName,
    startAt: appointment.startAt
  };

  if (appointment.customerPhone && notifications.hasAdapter("whatsapp")) {
    const result = await notifications.send({
      businessId: appointment.businessId,
      appointmentId: appointment.id,
      channel: "whatsapp",
      templateKey: "booking.confirmed",
      recipient: appointment.customerPhone,
      payload
    });

    if (result.status !== "failed") {
      return;
    }
  }

  if (appointment.customerEmail) {
    await notifications.send({
      businessId: appointment.businessId,
      appointmentId: appointment.id,
      channel: "email",
      templateKey: "booking.confirmed",
      recipient: appointment.customerEmail,
      payload
    });
  }
}
