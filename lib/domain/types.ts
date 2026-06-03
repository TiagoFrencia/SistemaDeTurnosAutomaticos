export type BlockingAppointmentStatus = "pending_payment" | "confirmed";

export type AppointmentStatus =
  | BlockingAppointmentStatus
  | "payment_failed"
  | "payment_expired"
  | "cancelled"
  | "attended"
  | "no_show";

export type PaymentOutcome = "approved" | "rejected" | "cancelled" | "expired" | "pending";

export type NotificationChannel = "email" | "whatsapp" | "sms";

export type NotificationTemplateKey =
  | "booking.confirmed"
  | "booking.reminder"
  | "booking.payment_failed"
  | "booking.payment_expired";

export type TimeRange = {
  startAt: string;
  endAt: string;
};

export type AppointmentRange = TimeRange & {
  professionalId: string;
  status: AppointmentStatus;
};
