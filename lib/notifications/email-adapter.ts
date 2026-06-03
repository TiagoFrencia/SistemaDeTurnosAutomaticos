import { Resend } from "resend";
import type {
  NotificationAdapter,
  NotificationRequest,
  NotificationResult
} from "@/lib/notifications/notification-service";

export class EmailNotificationAdapter implements NotificationAdapter {
  readonly channel = "email" as const;

  constructor(
    private readonly resend: Resend,
    private readonly fromEmail: string
  ) {}

  async send(request: NotificationRequest): Promise<NotificationResult> {
    try {
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to: request.recipient,
        subject: subjectFor(request.templateKey),
        html: renderPayload(request)
      });

      return {
        status: "sent",
        providerMessageId: response.data?.id
      };
    } catch (error) {
      return {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown email send error"
      };
    }
  }
}

function subjectFor(templateKey: NotificationRequest["templateKey"]): string {
  if (templateKey === "booking.confirmed") {
    return "Tu turno fue confirmado";
  }

  if (templateKey === "booking.reminder") {
    return "Recordatorio de tu turno";
  }

  if (templateKey === "booking.payment_expired") {
    return "Tu pago expiro";
  }

  return "No pudimos confirmar tu pago";
}

function renderPayload(request: NotificationRequest): string {
  return `<pre>${escapeHtml(JSON.stringify(request.payload, null, 2))}</pre>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
